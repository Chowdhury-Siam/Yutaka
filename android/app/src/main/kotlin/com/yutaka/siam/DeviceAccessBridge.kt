package com.yutaka.siam

import android.app.Activity
import android.app.KeyguardManager
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.hardware.biometrics.BiometricPrompt
import android.os.Build
import android.os.CancellationSignal
import android.view.WindowManager
import io.flutter.plugin.common.MethodChannel

/** Device credentials stay with Android; Yutaka stores only the opt-in flag. */
class DeviceAccessBridge(
    private val activity: MainActivity,
    private val launchCredential: (Intent) -> Unit,
) {
    private var pending: MethodChannel.Result? = null
    private var credentialPending = false
    private var cancellation: CancellationSignal? = null
    private val keyguard get() = activity.getSystemService(KeyguardManager::class.java)

    fun applyPrivacy() {
        val enabled = activity.getSharedPreferences("yutaka_widget", Activity.MODE_PRIVATE).getBoolean("lockEnabled", false)
        if (enabled) activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        else activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }

    fun handle(call: io.flutter.plugin.common.MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "authenticate" -> authenticate(result)
            "takeQuickAction" -> {
                result.success(activity.intent.getStringExtra(YutakaWidgetProvider.QUICK_ACTION))
                activity.intent.removeExtra(YutakaWidgetProvider.QUICK_ACTION)
            }
            "refreshWidget" -> {
                activity.getSharedPreferences("yutaka_widget", Activity.MODE_PRIVATE).edit()
                    .putString("symbol", call.argument<String>("symbol") ?: "৳")
                    .putBoolean("suffix", call.argument<Boolean>("suffix") != false)
                    .putBoolean("separators", call.argument<Boolean>("separators") != false)
                    .putBoolean("hidden", call.argument<Boolean>("hidden") == true)
                    .putBoolean("lockEnabled", call.argument<Boolean>("lockEnabled") == true).apply()
                applyPrivacy()
                YutakaWidgetProvider.refresh(activity)
                result.success(null)
            }
            "pinWidget" -> {
                val manager = AppWidgetManager.getInstance(activity)
                if (Build.VERSION.SDK_INT >= 26 && manager.isRequestPinAppWidgetSupported) {
                    result.success(manager.requestPinAppWidget(ComponentName(activity, YutakaWidgetProvider::class.java), null, null))
                } else result.success(false)
            }
            else -> result.notImplemented()
        }
    }

    private fun authenticate(result: MethodChannel.Result) {
        if (pending != null) {
            result.error("busy", "Authentication is already open.", null)
            return
        }
        if (keyguard?.isDeviceSecure != true) {
            result.success(false)
            return
        }
        pending = result
        credentialPending = false
        if (Build.VERSION.SDK_INT < 28) {
            useDeviceCredential()
            return
        }
        try {
            val builder = BiometricPrompt.Builder(activity)
                .setTitle("Unlock Yutaka")
                .setSubtitle("Use your fingerprint or device screen lock")
            if (Build.VERSION.SDK_INT >= 30) {
                builder.setAllowedAuthenticators(android.hardware.biometrics.BiometricManager.Authenticators.BIOMETRIC_WEAK or
                    android.hardware.biometrics.BiometricManager.Authenticators.DEVICE_CREDENTIAL)
            } else {
                builder.setNegativeButton("Use device lock", activity.mainExecutor) { _, _ -> useDeviceCredential() }
            }
            val signal = CancellationSignal()
            cancellation = signal
            builder.build().authenticate(signal, activity.mainExecutor, object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(value: BiometricPrompt.AuthenticationResult) { complete(true) }
                override fun onAuthenticationError(code: Int, message: CharSequence) {
                    if (code == BiometricPrompt.BIOMETRIC_ERROR_NO_BIOMETRICS ||
                        code == BiometricPrompt.BIOMETRIC_ERROR_HW_NOT_PRESENT ||
                        code == BiometricPrompt.BIOMETRIC_ERROR_HW_UNAVAILABLE ||
                        code == BiometricPrompt.BIOMETRIC_ERROR_LOCKOUT ||
                        code == BiometricPrompt.BIOMETRIC_ERROR_LOCKOUT_PERMANENT) useDeviceCredential()
                    else if (!credentialPending) complete(false)
                }
            })
        } catch (_: Exception) {
            useDeviceCredential()
        }
    }

    @Suppress("DEPRECATION")
    private fun useDeviceCredential() {
        if (pending == null || credentialPending) return
        val intent = keyguard?.createConfirmDeviceCredentialIntent("Unlock Yutaka", "Confirm your device screen lock")
        if (intent == null) { complete(false); return }
        credentialPending = true
        try { launchCredential(intent) } catch (_: Exception) { complete(false) }
    }

    fun complete(authenticated: Boolean) {
        val result = pending ?: return
        pending = null
        credentialPending = false
        cancellation = null
        result.success(authenticated)
    }

    fun dispose() {
        val signal = cancellation
        complete(false)
        signal?.cancel()
    }
}
