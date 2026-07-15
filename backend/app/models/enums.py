from enum import Enum


class Role(str, Enum):
    admin = "admin"
    worker = "worker"


class PostStatus(str, Enum):
    free = "free"
    playing = "playing"
    paused = "paused"
    maintenance = "maintenance"


class GameCategory(str, Enum):
    football = "football"
    other = "other"


class PricingMode(str, Enum):
    per_match = "per_match"
    per_time = "per_time"


class SessionStatus(str, Enum):
    active = "active"
    finished = "finished"
    cancelled = "cancelled"


class PaymentStatus(str, Enum):
    unpaid = "unpaid"
    partial = "partial"
    paid = "paid"


class DetectionEventType(str, Enum):
    session_started = "session_started"
    session_ended = "session_ended"
    game_detected = "game_detected"
    match_started = "match_started"
    match_ended = "match_ended"
    result_screen = "result_screen"
    unknown = "unknown"


class PaymentMethod(str, Enum):
    cash = "cash"
    card = "card"
    other = "other"


class AlertType(str, Enum):
    underpaid = "underpaid"
    overpaid = "overpaid"
    count_mismatch = "count_mismatch"
    manual_override = "manual_override"


class AlertStatus(str, Enum):
    open = "open"
    reviewed = "reviewed"
    resolved = "resolved"


class ShiftStatus(str, Enum):
    open = "open"
    closed = "closed"
