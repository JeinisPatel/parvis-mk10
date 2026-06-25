/**
 * Crest — the POLYMATH family mark.
 *
 * The geometric figure shared by every species in the POLYMATH line (RATIO,
 * PARVIS, …). Purely the parent crest; the wordmark differentiates the
 * species. Geometry is RATIO's landing mark (viewBox 0 0 708 557, three
 * paths). pathLength="1" normalises the draw-in animation regardless of each
 * path's real length; fill/stroke come from CSS (.crest in globals.css).
 *
 * Pass `draw` on the landing to run the stroke draw-in + fill; omit it
 * everywhere else for a statically-filled mark.
 */

interface Props {
  size?:      number;
  draw?:      boolean;
  className?: string;
  title?:     string;
}

export function Crest({ size = 32, draw = false, className = '', title = 'POLYMATH' }: Props) {
  const cls = `crest${draw ? ' crest--draw' : ''}${className ? ` ${className}` : ''}`;
  return (
    <svg
      viewBox="0 0 708 557"
      width={size}
      height={Math.round((size * 557) / 708)}
      role="img"
      aria-label={title}
      className={cls}
      style={{ overflow: 'visible', flex: '0 0 auto' }}
    >
      <title>{title}</title>
      <path pathLength={1} d="M254,484 L252,480 L246,476 L236,477 L228,487 L221,489 L123,489 L116,484 L109,483 L101,487 L98,492 L98,499 L104,507 L112,509 L118,507 L122,503 L230,503 L237,498 L245,499 L252,495 L254,491 Z" />
      <path pathLength={1} d="M697,544 L547,311 L431,126 L429,126 L352,200 L336,201 L275,262 L276,263 L339,220 L346,222 L351,230 L366,264 L367,270 L316,345 L249,410 L148,410 L148,425 L255,425 L317,372 L318,393 L258,444 L145,444 L138,439 L128,440 L122,447 L122,456 L130,464 L138,464 L145,459 L262,459 L317,413 L317,435 L280,469 L280,528 L44,528 L354,48 L361,57 L407,128 L409,128 L423,114 L354,10 L10,545 L295,546 L295,477 L333,441 L335,375 L464,375 L535,458 L617,458 L663,527 L655,529 L527,529 L454,453 L447,451 L441,457 L441,460 L445,466 L505,528 L477,529 L414,464 L415,457 L409,449 L402,447 L394,450 L390,455 L390,466 L396,472 L403,474 L455,528 L374,529 L373,510 L370,504 L366,501 L367,411 L444,411 L518,491 L565,491 L570,496 L577,498 L584,496 L589,491 L590,482 L588,478 L580,472 L571,473 L566,477 L525,477 L450,396 L351,396 L350,500 L344,511 L344,546 L600,546 Z" />
      <path pathLength={1} d="M420,150 L607,440 L607,443 L542,443 L471,359 L336,360 L334,358 L335,348 L388,270 L386,262 L364,214 Z" />
    </svg>
  );
}
