import { log } from '../shared/messages.js';

export async function loadSystem() {
  let systemName = null;
  if (game.hasOwnProperty('dnd5e')) {
    systemName = 'dnd5e';
  } else {
    game.groupCheck.system = BaseSystem;
  }
  log(`Loading ${systemName} specific checks`);
  const module = await import(`./${systemName}.js`);
  game.groupCheck.system = module.default;
}


export class BaseSystem {
  /**
   * Returns an object containing all of the valid checks
   * split into categories.
   */
  static allChecks() {
    return [];
  }

  static checkDataForAction(action) {
    return null;
  }

  static rollCheckForActor(action, actor) {
    return null;
  }
}
