# Release R8 rules. Prefer narrow keeps so Play can still count DEX obfuscation.

-keepattributes SourceFile,LineNumberTable,*Annotation*

# react-native-reanimated / worklets
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Native modules that use reflection / JNI
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class io.invertase.firebase.** { *; }
-keep class io.invertase.notifee.** { *; }
-keep class app.notifee.core.** { *; }

-dontwarn com.facebook.react.**
-dontwarn okhttp3.**
-dontwarn okio.**
