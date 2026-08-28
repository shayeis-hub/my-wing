# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ── Capacitor plugin bridge ──────────────────────────────────────────────
# The JS side calls @PluginMethod-annotated methods by name via reflection
# (through the Capacitor bridge). Without this, R8 can rename or strip
# WidgetBridgePlugin's methods and the JS↔native call silently fails —
# no build error, just a dead widget at runtime.
-keep @com.getcapacitor.annotation.CapacitorPlugin class * {
    @com.getcapacitor.annotation.PluginMethod <methods>;
}

# ── App widgets ───────────────────────────────────────────────────────────
# AppWidgetProvider subclasses (WingWidgetProvider) are instantiated by
# class name from the manifest/widget XML, not from a traceable reference —
# same silent-failure risk as above.
-keep class * extends android.appwidget.AppWidgetProvider

# ── Firebase Authentication plugin, unused optional provider ─────────────
# @capacitor-firebase/authentication supports Facebook Login as one of
# several optional providers, but we don't include the Facebook SDK (we
# only use Google/Apple/email) — these classes are genuinely absent, R8
# is right to flag them, safe to tell it to stop warning.
-dontwarn com.facebook.CallbackManager$Factory
-dontwarn com.facebook.CallbackManager
-dontwarn com.facebook.FacebookCallback
-dontwarn com.facebook.login.LoginManager
-dontwarn com.facebook.login.widget.LoginButton
