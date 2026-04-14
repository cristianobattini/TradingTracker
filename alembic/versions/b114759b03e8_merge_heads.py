"""merge heads

Revision ID: b114759b03e8
Revises: 1a2b3c4d5e6f, add_share_pinned
Create Date: 2026-04-14 18:52:03.322131

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b114759b03e8'
down_revision: Union[str, Sequence[str], None] = ('1a2b3c4d5e6f', 'add_share_pinned')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
