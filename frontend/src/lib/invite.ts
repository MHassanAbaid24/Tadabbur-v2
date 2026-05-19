const INVITE_PATH_REGEX = /^\/circle\/join\/([^/?#]+)\/?$/

type InviteCodeParseResult = {
  inviteCode: string | null
  error: string | null
}

export function parseInviteCodeInput(input: string): InviteCodeParseResult {
  const value = input.trim()
  if (!value) {
    return { inviteCode: null, error: null }
  }

  // A plain invite code should still work.
  if (!value.includes('/')) {
    return { inviteCode: value, error: null }
  }

  try {
    const parsedUrl = new URL(value)
    const match = parsedUrl.pathname.match(INVITE_PATH_REGEX)
    if (!match) {
      return {
        inviteCode: null,
        error: 'Please use an invite link in the format /circle/join/{code} or paste the code directly.',
      }
    }

    const inviteCode = decodeURIComponent(match[1]).trim()
    if (!inviteCode) {
      return { inviteCode: null, error: 'Please enter a valid invite code.' }
    }

    return { inviteCode, error: null }
  } catch {
    return {
      inviteCode: null,
      error: 'Please enter a valid invite code or full invite link.',
    }
  }
}
