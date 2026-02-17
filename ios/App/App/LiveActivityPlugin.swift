import Foundation
import Capacitor
import ActivityKit

@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityPlugin"
    public let jsName = "LiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endActivity", returnType: CAPPluginReturnPromise),
    ]

    private let appGroupId = "group.com.safaritrack.app"
    private let activityIdKey = "currentLiveActivityId"

    @objc func startActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve()
            return
        }
        let driveName = call.getString("driveName") ?? "Game Drive"
        let startedAtString = call.getString("startedAt") ?? ""
        let startedAt = ISO8601DateFormatter().date(from: startedAtString) ?? Date()
        let attributes = DriveActivityAttributes(driveName: driveName, startedAt: startedAt)
        let initialState = DriveActivityAttributes.ContentState(distanceMetres: 0, sightingCount: 0)
        do {
            let activity = try Activity.request(
                attributes: attributes,
                content: ActivityContent(state: initialState, staleDate: nil),
                pushType: nil
            )
            UserDefaults(suiteName: appGroupId)?.set(activity.id, forKey: activityIdKey)
            call.resolve()
        } catch {
            call.resolve()
        }
    }

    @objc func updateActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        let distanceMetres = call.getDouble("distanceMetres") ?? 0
        let sightingCount = call.getInt("sightingCount") ?? 0
        guard let activityId = UserDefaults(suiteName: appGroupId)?.string(forKey: activityIdKey) else {
            call.resolve()
            return
        }
        let updatedState = DriveActivityAttributes.ContentState(
            distanceMetres: distanceMetres,
            sightingCount: sightingCount
        )
        Task {
            for activity in Activity<DriveActivityAttributes>.activities where activity.id == activityId {
                await activity.update(ActivityContent(state: updatedState, staleDate: nil))
            }
        }
        call.resolve()
    }

    @objc func endActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        let defaults = UserDefaults(suiteName: appGroupId)
        guard let activityId = defaults?.string(forKey: activityIdKey) else {
            call.resolve()
            return
        }
        Task {
            for activity in Activity<DriveActivityAttributes>.activities where activity.id == activityId {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
        defaults?.removeObject(forKey: activityIdKey)
        call.resolve()
    }
}
