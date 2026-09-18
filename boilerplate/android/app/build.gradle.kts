plugins {
    id("com.android.application")
}

val stableTestKeystorePath = providers.environmentVariable("CONWAY_TEST_KEYSTORE").orNull
val stableTestKeystorePassword = providers.environmentVariable("CONWAY_TEST_KEYSTORE_PASSWORD").orNull
    ?: "wegert-debug"
val stableTestKeyPassword = providers.environmentVariable("CONWAY_TEST_KEY_PASSWORD").orNull
    ?: stableTestKeystorePassword
val stableTestKeyAlias = providers.environmentVariable("CONWAY_TEST_KEY_ALIAS").orNull
    ?: "wegert-debug"

android {
    namespace = "org.isomorphisms.conway"
    compileSdk = 36
    ndkVersion = "29.0.14206865"

    defaultConfig {
        applicationId = "org.isomorphisms.conway"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"

        ndk {
            abiFilters += listOf("arm64-v8a", "armeabi-v7a", "x86_64")
        }

        externalNativeBuild {
            cmake {
                arguments += "-DANDROID_STL=none"
            }
        }
    }

    signingConfigs {
        stableTestKeystorePath?.let { keystorePath ->
            create("stableTest") {
                storeFile = rootProject.file(keystorePath)
                storePassword = stableTestKeystorePassword
                keyAlias = stableTestKeyAlias
                keyPassword = stableTestKeyPassword
                storeType = "pkcs12"
            }
        }
    }

    buildTypes {
        getByName("debug") {
            // If no stable test signer is supplied, keep debug unsigned instead
            // of falling back to a machine-local Gradle debug identity.
            signingConfig = signingConfigs.findByName("stableTest")
        }
    }

    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = "3.22.1"
        }
    }
}
