

export interface Help {
  longName: string
  help: string
}

export type HelpState = {
  helps: Help[]
}

export type HelpAction = {
  type: string
  help: Help
}

export const ADD_HELP = "ADD_HELP"

export type DispatchType = (args: HelpAction) => HelpAction