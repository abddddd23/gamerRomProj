from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_admin
from app.db.session import get_db
from app.models import Game, Worker
from app.schemas import GameCreate, GameRead, GameUpdate


router = APIRouter(prefix="/games", tags=["games"])


@router.get("", response_model=list[GameRead])
def list_games(db: Session = Depends(get_db), _: Worker = Depends(get_current_user)) -> list[Game]:
    return list(db.scalars(select(Game).order_by(Game.name.asc())))


@router.post("", response_model=GameRead, status_code=status.HTTP_201_CREATED)
def create_game(payload: GameCreate, db: Session = Depends(get_db), _: Worker = Depends(require_admin)) -> Game:
    game = Game(**payload.model_dump())
    db.add(game)
    db.commit()
    db.refresh(game)
    return game


@router.patch("/{game_id}", response_model=GameRead)
def update_game(
    game_id: int,
    payload: GameUpdate,
    db: Session = Depends(get_db),
    _: Worker = Depends(require_admin),
) -> Game:
    game = db.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(game, key, value)
    db.commit()
    db.refresh(game)
    return game
