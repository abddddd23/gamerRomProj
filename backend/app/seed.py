from sqlalchemy import select

from app.auth.security import get_password_hash
from app.db.session import Base, SessionLocal, engine
from app.models import Game, GameCategory, Post, PricingMode, Role, Worker


def seed(include_demo_users: bool = False) -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        users = [
            {
                "name": "Admin",
                "username": "admin",
                "email": "admin@gaming-room.local",
                "phone_number": "0000000000",
                "password": "admin123",
                "role": Role.admin,
            },
            {
                "name": "Worker One",
                "username": "worker1",
                "email": "worker1@gaming-room.local",
                "phone_number": "0550000000",
                "password": "worker123",
                "role": Role.worker,
            },
        ]
        for user in users if include_demo_users else []:
            existing = db.scalar(select(Worker).where(Worker.username == user["username"]))
            if not existing:
                db.add(
                    Worker(
                        name=user["name"],
                        username=user["username"],
                        email=user["email"],
                        phone_number=user["phone_number"],
                        hashed_password=get_password_hash(user["password"]),
                        role=user["role"],
                    )
                )
            else:
                existing.email = user["email"]
                existing.phone_number = user["phone_number"]

        for index in range(1, 5):
            name = f"Post {index}"
            if not db.scalar(select(Post).where(Post.name == name)):
                db.add(Post(name=name))

        games = [
            ("FIFA", "FC", GameCategory.football, PricingMode.per_match, 100, None, None, None),
            ("PES", None, GameCategory.football, PricingMode.per_match, 100, None, None, None),
            ("eFootball", "eFootball", GameCategory.football, PricingMode.per_match, 100, None, None, None),
            ("GTA", "GTA", GameCategory.other, PricingMode.per_time, None, 300, 20, 100),
            ("Mortal Kombat", "MK", GameCategory.other, PricingMode.per_time, None, 300, 20, 100),
        ]
        for (
            name,
            ai_label,
            category,
            pricing_mode,
            price_per_match,
            price_per_hour,
            billing_unit_minutes,
            price_per_time_unit,
        ) in games:
            existing_game = db.scalar(select(Game).where(Game.name == name))
            if not existing_game:
                db.add(
                    Game(
                        name=name,
                        ai_label=ai_label,
                        category=category,
                        pricing_mode=pricing_mode,
                        price_per_match=price_per_match,
                        price_per_hour=price_per_hour,
                        billing_unit_minutes=billing_unit_minutes,
                        price_per_time_unit=price_per_time_unit,
                    )
                )
            else:
                existing_game.ai_label = ai_label
                existing_game.category = category
                existing_game.pricing_mode = pricing_mode
                existing_game.price_per_match = price_per_match
                if pricing_mode == PricingMode.per_match:
                    existing_game.price_per_hour = None
                elif existing_game.price_per_hour is None:
                    existing_game.price_per_hour = price_per_hour
                existing_game.billing_unit_minutes = billing_unit_minutes
                existing_game.price_per_time_unit = price_per_time_unit
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
