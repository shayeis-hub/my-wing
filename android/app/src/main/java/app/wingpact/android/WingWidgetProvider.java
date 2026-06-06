package app.wingpact.android;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/**
 * Home-screen widget: warm pill showing logo, steps, water (+/-) and an SOS button.
 *
 * Data bridge: the web app (via Capacitor Preferences) writes values into the
 * "CapacitorStorage" SharedPreferences file; this widget reads them. Water +/-
 * taps update the value locally and accumulate a pending delta that the app
 * applies to Firestore on next open. SOS opens the app, which performs the send.
 */
public class WingWidgetProvider extends AppWidgetProvider {

    private static final String PREFS = "CapacitorStorage";
    private static final String KEY_STEPS = "widget_steps";
    private static final String KEY_WATER = "widget_water";
    private static final String KEY_WATER_DELTA = "widget_pending_water_delta";
    private static final String KEY_ACTION = "widget_action";

    public static final String ACTION_WATER_PLUS = "app.wingpact.android.WIDGET_WATER_PLUS";
    public static final String ACTION_WATER_MINUS = "app.wingpact.android.WIDGET_WATER_MINUS";
    public static final String ACTION_SOS = "app.wingpact.android.WIDGET_SOS";

    private static final float WATER_STEP = 0.1f;
    private static final float WATER_MAX = 4.0f;

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            manager.updateAppWidget(id, buildViews(context));
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (action == null) return;

        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        if (ACTION_WATER_PLUS.equals(action) || ACTION_WATER_MINUS.equals(action)) {
            float water = parseFloat(prefs.getString(KEY_WATER, "0"));
            float delta = parseFloat(prefs.getString(KEY_WATER_DELTA, "0"));
            float oldWater = water;
            if (ACTION_WATER_PLUS.equals(action)) {
                water = round1(Math.min(WATER_MAX, water + WATER_STEP));
            } else {
                water = round1(Math.max(0f, water - WATER_STEP));
            }
            delta = round1(delta + (water - oldWater));
            prefs.edit()
                .putString(KEY_WATER, trim(water))
                .putString(KEY_WATER_DELTA, trim(delta))
                .apply();
            refreshAll(context);
        } else if (ACTION_SOS.equals(action)) {
            // Flag the SOS for the web app to send, then bring the app to front.
            prefs.edit().putString(KEY_ACTION, "sos").apply();
            Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (launch != null) {
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                context.startActivity(launch);
            }
        }
    }

    private void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, WingWidgetProvider.class));
        for (int id : ids) {
            manager.updateAppWidget(id, buildViews(context));
        }
    }

    private RemoteViews buildViews(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.wing_widget);

        // Steps
        long steps = parseLong(prefs.getString(KEY_STEPS, "0"));
        views.setTextViewText(R.id.tv_steps, "👟 " + String.format("%,d", steps));

        // Water
        float water = parseFloat(prefs.getString(KEY_WATER, "0"));
        views.setTextViewText(R.id.tv_water, trim(water) + "L");

        // Click actions
        views.setOnClickPendingIntent(R.id.btn_water_plus, broadcast(context, ACTION_WATER_PLUS, 1));
        views.setOnClickPendingIntent(R.id.btn_water_minus, broadcast(context, ACTION_WATER_MINUS, 2));
        views.setOnClickPendingIntent(R.id.tv_sos, broadcast(context, ACTION_SOS, 3));

        PendingIntent open = openApp(context);
        views.setOnClickPendingIntent(R.id.iv_logo, open);
        views.setOnClickPendingIntent(R.id.tv_steps, open);

        return views;
    }

    private PendingIntent broadcast(Context context, String action, int reqCode) {
        Intent intent = new Intent(context, WingWidgetProvider.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(
            context, reqCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private PendingIntent openApp(Context context) {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) launch = new Intent();
        launch.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(
            context, 0, launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    // ── helpers ──────────────────────────────────────────────────────────────
    private static float parseFloat(String s) {
        try { return Float.parseFloat(s); } catch (Exception e) { return 0f; }
    }
    private static long parseLong(String s) {
        try { return Long.parseLong(s.trim()); } catch (Exception e) { return 0L; }
    }
    private static float round1(float v) {
        return Math.round(v * 10f) / 10f;
    }
    /** Trim a one-decimal float to a clean string ("2" not "2.0", "1.5" stays). */
    private static String trim(float v) {
        float r = round1(v);
        if (r == Math.round(r)) return String.valueOf(Math.round(r));
        return String.valueOf(r);
    }
}
