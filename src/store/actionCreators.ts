

import * as types from "./types"
 

//  TODO: figure out how to use this and hook it up instead of fetching help in every component. Or else delete.


export function addHelp(help: types.Help) {
  const action: types.HelpAction = {
    type: types.ADD_HELP,
    help,
  }
  return simulateHttpRequest(action)
}

// export function removeArticle(article: IArticle) {
//   const action: ArticleAction = {
//     type: actionTypes.REMOVE_ARTICLE,
//     article,
//   }
//   return simulateHttpRequest(action)
// }

export function simulateHttpRequest(action: types.HelpAction) {
  return (dispatch: types.DispatchType) => {
    setTimeout(() => {
      dispatch(action)
    }, 500)
  }
}
