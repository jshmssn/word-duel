// ─── Custom SVG Icons ─────────────────────────────────────────────────────────

export function IconSword({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M8 40L20 28" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <path d="M13 35L8 40L13 43L16 38" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill={color} fillOpacity="0.3"/>
      <path d="M22 26L38 10L40 8L42 10L40 12L26 28" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M38 10L42 14" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="34" cy="14" r="2" fill={color} fillOpacity="0.6"/>
    </svg>
  );
}

export function IconShield({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M24 6L10 12V24C10 32 17 39 24 42C31 39 38 32 38 24V12L24 6Z" stroke={color} strokeWidth="3" strokeLinejoin="round" fill={color} fillOpacity="0.15"/>
      <path d="M18 24L22 28L30 20" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconKey({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="18" cy="20" r="9" stroke={color} strokeWidth="3" fill={color} fillOpacity="0.15"/>
      <circle cx="18" cy="20" r="4" fill={color} fillOpacity="0.5"/>
      <path d="M25 24L38 37" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <path d="M33 32L36 29" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M36 35L39 32" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

export function IconTarget({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="18" stroke={color} strokeWidth="3" fill={color} fillOpacity="0.08"/>
      <circle cx="24" cy="24" r="11" stroke={color} strokeWidth="2.5" fill={color} fillOpacity="0.12"/>
      <circle cx="24" cy="24" r="5" fill={color} fillOpacity="0.7"/>
      <path d="M24 6V10M24 38V42M6 24H10M38 24H42" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

export function IconStar({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M24 6L28.5 18H42L31.5 26L35.5 38L24 30L12.5 38L16.5 26L6 18H19.5L24 6Z" stroke={color} strokeWidth="2.5" strokeLinejoin="round" fill={color} fillOpacity="0.8"/>
    </svg>
  );
}

export function IconChat({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M8 12C8 9.8 9.8 8 12 8H36C38.2 8 40 9.8 40 12V28C40 30.2 38.2 32 36 32H20L12 40V32H12C9.8 32 8 30.2 8 28V12Z" stroke={color} strokeWidth="3" strokeLinejoin="round" fill={color} fillOpacity="0.15"/>
      <circle cx="17" cy="20" r="2.5" fill={color}/>
      <circle cx="24" cy="20" r="2.5" fill={color}/>
      <circle cx="31" cy="20" r="2.5" fill={color}/>
    </svg>
  );
}

export function IconTrophy({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M16 8H32V24C32 30.6 28.4 34 24 34C19.6 34 16 30.6 16 24V8Z" stroke={color} strokeWidth="3" strokeLinejoin="round" fill={color} fillOpacity="0.2"/>
      <path d="M16 12H10C10 12 8 22 16 24" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M32 12H38C38 12 40 22 32 24" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M24 34V40" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <path d="M17 40H31" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <path d="M20 20L23 23L28 17" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconSkull({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M24 8C16 8 10 14 10 22C10 27 13 31 17 33V38H31V33C35 31 38 27 38 22C38 14 32 8 24 8Z" stroke={color} strokeWidth="3" strokeLinejoin="round" fill={color} fillOpacity="0.2"/>
      <circle cx="18" cy="22" r="4" fill={color} fillOpacity="0.7"/>
      <circle cx="30" cy="22" r="4" fill={color} fillOpacity="0.7"/>
      <path d="M20 38H28" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M24 33V38" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function IconLetter({ size = 24, color = "currentColor", letter = "A" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="4" y="4" width="40" height="40" rx="10" stroke={color} strokeWidth="3" fill={color} fillOpacity="0.12"/>
      <text x="24" y="33" textAnchor="middle" fontSize="24" fontWeight="900" fontFamily="Fredoka One, cursive" fill={color}>{letter}</text>
    </svg>
  );
}

export function IconCopy({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="16" y="4" width="28" height="32" rx="5" stroke={color} strokeWidth="3" fill={color} fillOpacity="0.1"/>
      <rect x="4" y="12" width="28" height="32" rx="5" stroke={color} strokeWidth="3" fill={color} fillOpacity="0.2"/>
    </svg>
  );
}

export function IconCheck({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M10 24L20 34L38 14" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconX({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M14 14L34 34M34 14L14 34" stroke={color} strokeWidth="4" strokeLinecap="round"/>
    </svg>
  );
}

export function IconSend({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M6 24L42 8L28 42L22 26L6 24Z" stroke={color} strokeWidth="3" strokeLinejoin="round" fill={color} fillOpacity="0.3"/>
      <path d="M22 26L42 8" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

export function IconQuestion({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="19" stroke={color} strokeWidth="3" fill={color} fillOpacity="0.1"/>
      <path d="M18 18C18 15 20.7 13 24 13C27.3 13 30 15.3 30 18.5C30 21 28 23 25 25V28" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="24" cy="33" r="2.5" fill={color}/>
    </svg>
  );
}

export function IconLetterCount({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="7" y="7" width="34" height="34" rx="8" stroke={color} strokeWidth="3" fill={color} fillOpacity="0.1"/>
      <path d="M15 16H21M15 24H24M15 32H19" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="31" cy="18" r="4" stroke={color} strokeWidth="2.5" fill={color} fillOpacity="0.16"/>
      <path d="M34 21L38 25" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M29 31H36" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <path d="M32.5 27.5V34.5" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

export function IconLightning({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M28 6L12 26H24L20 42L36 22H24L28 6Z" stroke={color} strokeWidth="3" strokeLinejoin="round" fill={color} fillOpacity="0.7"/>
    </svg>
  );
}

export function IconDice({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="6" y="6" width="36" height="36" rx="8" stroke={color} strokeWidth="3" fill={color} fillOpacity="0.12"/>
      <circle cx="16" cy="16" r="3" fill={color}/>
      <circle cx="32" cy="16" r="3" fill={color}/>
      <circle cx="16" cy="32" r="3" fill={color}/>
      <circle cx="32" cy="32" r="3" fill={color}/>
      <circle cx="24" cy="24" r="3" fill={color}/>
    </svg>
  );
}

export function IconWiggle({ size = 32, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 32" fill="none">
      <path d="M4 16 Q12 4 20 16 Q28 28 36 16 Q44 4 52 16 Q58 24 64 16" stroke={color} strokeWidth="4" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

export function IconStar2({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2L14.4 9.2H22L16 13.8L18.4 21L12 16.4L5.6 21L8 13.8L2 9.2H9.6L12 2Z"/>
    </svg>
  );
}

export function IconHome({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M8 23L24 10L40 23" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 22V39H35V22" stroke={color} strokeWidth="3" strokeLinejoin="round" fill={color} fillOpacity="0.12"/>
      <path d="M20 39V28H28V39" stroke={color} strokeWidth="3" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconRocket({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M28 7C35 8 40 13 41 20L29 32L16 19L28 7Z" stroke={color} strokeWidth="3" strokeLinejoin="round" fill={color} fillOpacity="0.16"/>
      <circle cx="31" cy="17" r="4" stroke={color} strokeWidth="2.5" fill={color} fillOpacity="0.2"/>
      <path d="M17 30L11 36M13 25L8 27L12 31M23 35L21 40L17 36" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconLetters({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="7" y="9" width="15" height="15" rx="4" stroke={color} strokeWidth="3" fill={color} fillOpacity="0.12"/>
      <rect x="26" y="24" width="15" height="15" rx="4" stroke={color} strokeWidth="3" fill={color} fillOpacity="0.12"/>
      <path d="M12 20L14.5 13L17 20M13 18H16" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M31 29H35C37 29 38 30 38 32C38 34 37 35 35 35H31V29ZM31 35H35.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconBulb({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M24 7C17.5 7 13 11.5 13 17.5C13 21.5 15 24.5 18 27V31H30V27C33 24.5 35 21.5 35 17.5C35 11.5 30.5 7 24 7Z" stroke={color} strokeWidth="3" strokeLinejoin="round" fill={color} fillOpacity="0.14"/>
      <path d="M19 36H29M20 41H28M24 2V4M39 9L37 11M9 9L11 11" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

export function IconClock({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="17" stroke={color} strokeWidth="3" fill={color} fillOpacity="0.1"/>
      <path d="M24 14V25L31 29" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 6L9 11M33 6L39 11" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

export function IconWarning({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M24 7L43 40H5L24 7Z" stroke={color} strokeWidth="3" strokeLinejoin="round" fill={color} fillOpacity="0.12"/>
      <path d="M24 18V28" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="24" cy="34" r="2.5" fill={color}/>
    </svg>
  );
}

export function IconBoom({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M24 5L28 17L41 12L34 24L43 34L30 33L24 43L18 33L5 34L14 24L7 12L20 17L24 5Z" stroke={color} strokeWidth="3" strokeLinejoin="round" fill={color} fillOpacity="0.16"/>
      <path d="M19 24H29" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

export function IconReturnArrow({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M18 15L9 24L18 33" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 24H31C36 24 39 27 39 32C39 37 35 40 29 40H24" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconHourglass({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M14 7H34M14 41H34" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <path d="M17 7V16C17 20 20 22 24 24C20 26 17 28 17 32V41H31V32C31 28 28 26 24 24C28 22 31 20 31 16V7H17Z" stroke={color} strokeWidth="3" strokeLinejoin="round" fill={color} fillOpacity="0.1"/>
      <path d="M20 35H28M21 15H27" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}
