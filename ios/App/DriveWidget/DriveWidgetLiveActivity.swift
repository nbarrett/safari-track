import ActivityKit
import WidgetKit
import SwiftUI

private let brandGold = Color(red: 0.831, green: 0.659, blue: 0.263)

struct DriveWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DriveActivityAttributes.self) { context in
            LockScreenView(context: context)
                .activityBackgroundTint(Color.black.opacity(0.85))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label {
                        Text(context.attributes.driveName)
                            .font(.caption2)
                            .foregroundColor(.white)
                            .lineLimit(1)
                    } icon: {
                        Image(systemName: "pawprint.fill")
                            .foregroundColor(brandGold)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.attributes.startedAt, style: .timer)
                        .font(.system(.body, design: .monospaced).bold())
                        .foregroundColor(brandGold)
                        .monospacedDigit()
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(String(format: "%.1f km · %d sightings",
                                context.state.distanceMetres / 1000,
                                context.state.sightingCount))
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))
                }
            } compactLeading: {
                Image(systemName: "pawprint.fill")
                    .foregroundColor(brandGold)
                    .font(.caption)
            } compactTrailing: {
                Text(context.attributes.startedAt, style: .timer)
                    .font(.system(.caption2, design: .monospaced).bold())
                    .foregroundColor(brandGold)
                    .monospacedDigit()
                    .frame(minWidth: 40)
            } minimal: {
                Image(systemName: "pawprint.fill")
                    .foregroundColor(brandGold)
            }
        }
    }
}

private struct LockScreenView: View {
    let context: ActivityViewContext<DriveActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "pawprint.fill")
                    .font(.caption)
                    .foregroundColor(brandGold)
                Text("Safari Track")
                    .font(.caption.weight(.semibold))
                    .foregroundColor(.white.opacity(0.7))
                Spacer()
                Text(context.attributes.driveName)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(.white)
                    .lineLimit(1)
            }

            Text(context.attributes.startedAt, style: .timer)
                .font(.system(size: 44, weight: .bold, design: .monospaced))
                .foregroundColor(brandGold)
                .monospacedDigit()

            HStack {
                Text(String(format: "%.1f km", context.state.distanceMetres / 1000))
                    .font(.title3.weight(.semibold))
                    .foregroundColor(.white)
                if context.state.sightingCount > 0 {
                    Text("·")
                        .foregroundColor(.white.opacity(0.5))
                    Text("\(context.state.sightingCount) sightings")
                        .font(.body.weight(.medium))
                        .foregroundColor(.white.opacity(0.7))
                }
                Spacer()
                Text("Tap to open")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.4))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}
