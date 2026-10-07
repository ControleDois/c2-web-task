import { LABEL_COLORS, type Card, type Label } from '../lib/kanban'
import { DUE_STYLES, avatarColor, dueState, formatShortDate, initials } from '../lib/cardUtils'
import { ChecklistIcon, ClockIcon, CommentIcon, PaperclipIcon, TextIcon } from './kbIcons'

interface CardTileProps {
  card: Card
  labels: Label[]
  dragging: boolean
  draggable: boolean
  onOpen: () => void
  onDragStart: () => void
  onDragEnd: () => void
}

export function CardTile({ card, labels, dragging, draggable, onOpen, onDragStart, onDragEnd }: CardTileProps) {
  const cardLabels = labels.filter((label) => card.label_ids.includes(label.id))
  const checklistDone = card.checklist.total > 0 && card.checklist.done === card.checklist.total
  const hasBadges =
    card.due ||
    card.has_description ||
    card.comments > 0 ||
    card.attachments > 0 ||
    card.checklist.total > 0 ||
    card.members.length > 0

  return (
    <article
      data-card-id={card.id}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', card.id)
        event.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={`cursor-pointer overflow-hidden rounded-lg bg-[var(--kb-card)] text-[var(--kb-card-ink)] transition hover:bg-[var(--kb-card-hover)] ${
        dragging ? 'opacity-40' : ''
      }`}
      style={{ boxShadow: 'var(--kb-shadow)' }}
    >
      {card.cover_url ? (
        <img src={card.cover_url} alt="" className="max-h-44 w-full object-cover" draggable={false} />
      ) : card.cover_color ? (
        <div className="h-9 w-full" style={{ background: LABEL_COLORS[card.cover_color] ?? card.cover_color }} />
      ) : null}

      <div className="px-3 pb-2 pt-2">
        {cardLabels.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {cardLabels.map((label) => (
              <span
                key={label.id}
                title={label.name ?? undefined}
                className="h-2 min-w-10 rounded-full"
                style={{ background: LABEL_COLORS[label.color] }}
              />
            ))}
          </div>
        )}

        <p className="text-[14px] leading-snug">{card.title}</p>

        {hasBadges && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-[var(--kb-list-muted)]">
            {card.due && (
              <span
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${DUE_STYLES[dueState(card.due, card.due_complete)]}`}
              >
                <ClockIcon className="h-3.5 w-3.5" />
                {formatShortDate(card.due)}
              </span>
            )}
            {card.has_description && <TextIcon className="h-3.5 w-3.5" />}
            {card.comments > 0 && (
              <span className="flex items-center gap-1">
                <CommentIcon className="h-3.5 w-3.5" />
                {card.comments}
              </span>
            )}
            {card.attachments > 0 && (
              <span className="flex items-center gap-1">
                <PaperclipIcon className="h-3.5 w-3.5" />
                {card.attachments}
              </span>
            )}
            {card.checklist.total > 0 && (
              <span
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${checklistDone ? 'bg-[#4bce97] text-[#09326c]' : ''}`}
              >
                <ChecklistIcon className="h-3.5 w-3.5" />
                {card.checklist.done}/{card.checklist.total}
              </span>
            )}
            {card.members.length > 0 && (
              <span className="ml-auto flex -space-x-1">
                {card.members.map((member) => (
                  <span
                    key={member.id}
                    title={member.name}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-[var(--kb-card)]"
                    style={{ background: avatarColor(member.id) }}
                  >
                    {initials(member.name)}
                  </span>
                ))}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
