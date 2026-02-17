import Foundation
import ActivityKit

struct DriveActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var distanceMetres: Double
        var sightingCount: Int
    }
    var driveName: String
    var startedAt: Date
}
