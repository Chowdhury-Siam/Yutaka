package com.yutaka.siam

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.widget.RemoteViews
import java.text.DecimalFormat
import java.util.Calendar
import java.util.concurrent.Executors

class YutakaWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { refresh(context) }
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE || intent.action == Intent.ACTION_DATE_CHANGED ||
            intent.action == Intent.ACTION_TIME_CHANGED || intent.action == Intent.ACTION_TIMEZONE_CHANGED ||
            intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            val pending = goAsync()
            refresh(context) { pending.finish() }
        } else super.onReceive(context, intent)
    }

    companion object {
        const val QUICK_ACTION = "com.yutaka.siam.QUICK_ACTION"
        private val executor = Executors.newSingleThreadExecutor()

        fun refresh(context: Context, finished: () -> Unit = {}) {
            val app = context.applicationContext
            val manager = AppWidgetManager.getInstance(app)
            val ids = manager.getAppWidgetIds(ComponentName(app, YutakaWidgetProvider::class.java))
            if (ids.isEmpty()) { finished(); return }
            executor.execute {
                try {
                val preferences = app.getSharedPreferences("yutaka_widget", Context.MODE_PRIVATE)
                val hidden = preferences.getBoolean("hidden", false) || preferences.getBoolean("lockEnabled", false)
                val views = RemoteViews(app.packageName, R.layout.yutaka_widget)
                var display = "Open Yutaka to refresh"
                if (hidden) display = "••••"
                else {
                    try {
                        val path = app.getDatabasePath("yutaka_flutter.db")
                        if (path.exists()) {
                            val start = Calendar.getInstance().apply {
                                set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
                            }
                            val end = (start.clone() as Calendar).apply { add(Calendar.DAY_OF_MONTH, 1) }
                            SQLiteDatabase.openDatabase(path.path, null, SQLiteDatabase.OPEN_READONLY).use { database ->
                                database.rawQuery("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'expense' AND exclude_from_reports = 0 AND created_on >= ? AND created_on < ?",
                                    arrayOf(start.timeInMillis.toString(), end.timeInMillis.toString())).use { cursor ->
                                    cursor.moveToFirst()
                                    val format = DecimalFormat(if (preferences.getBoolean("separators", true)) "#,##0.##" else "0.##")
                                    val amount = format.format(cursor.getDouble(0))
                                    val symbol = preferences.getString("symbol", "৳") ?: "৳"
                                    display = if (preferences.getBoolean("suffix", true)) "$amount$symbol" else "$symbol$amount"
                                }
                            }
                        }
                    } catch (_: Exception) {
                        // No cached finance data is exposed when the database is unavailable.
                    }
                }
                views.setTextViewText(R.id.widget_amount, display)
                val open = Intent(app, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(app, 701, open, flags))
                val add = Intent(open).putExtra(QUICK_ACTION, "add_expense")
                views.setOnClickPendingIntent(R.id.widget_add, PendingIntent.getActivity(app, 702, add, flags))
                manager.updateAppWidget(ids, views)
                } catch (_: Exception) {
                    // Launcher/host failures must not crash the finance app.
                } finally { finished() }
            }
        }
    }
}
