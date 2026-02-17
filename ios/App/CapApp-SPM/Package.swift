// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.1.0"),
        .package(name: "CapacitorApp", path: "../../../node_modules/.pnpm/@capacitor+app@8.0.1_@capacitor+core@8.1.0/node_modules/@capacitor/app"),
        .package(name: "CapacitorCamera", path: "../../../node_modules/.pnpm/@capacitor+camera@8.0.1_@capacitor+core@8.1.0/node_modules/@capacitor/camera"),
        .package(name: "CapacitorPushNotifications", path: "../../../node_modules/.pnpm/@capacitor+push-notifications@8.0.1_@capacitor+core@8.1.0/node_modules/@capacitor/push-notifications"),
        .package(name: "CapgoBackgroundGeolocation", path: "../../../node_modules/.pnpm/@capgo+background-geolocation@8.0.21_@capacitor+core@8.1.0/node_modules/@capgo/background-geolocation")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorCamera", package: "CapacitorCamera"),
                .product(name: "CapacitorPushNotifications", package: "CapacitorPushNotifications"),
                .product(name: "CapgoBackgroundGeolocation", package: "CapgoBackgroundGeolocation")
            ]
        )
    ]
)
