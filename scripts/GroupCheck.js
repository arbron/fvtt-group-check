import constants from './shared/constants.js';
import { log } from './shared/messages.js';

// Generic Check Types:
// - Formula: DM enters roll formula that is rolled for each player
// - Manual: Players can enter a result manually

/*
 * GroupCheck.data
 *
 * title: string?       - Title to display at the top of the chat box.
 * description: string? - Description to display to players.
 * checks: [string]     - Valid ability checks for players to perform.
 * dc: Number?          - DC to compare each check against.
 *
 * results: [Actor:Roll] - Map of results for each actor.
 */

const check_source = [
  { "name": "acr", "label": "Acrobatics", "type": "skill", "localization": "DND5E.SkillAcr" },
  { "name": "ani", "label": "Animal Handling", "type": "skill", "localization": "DND5E.SkillAni" }
];

const IS_GROUP_CHECK_FLAG = 'isGroupCheck';
const DATA_FLAG = 'data';
const RESULTS_FLAG = 'results';

class GroupCheck {
  constructor(data, recreate=false) {
    this.title = data.title;
    this.description = data.description;
    this.dc = data.dc;
    this.checks = data.checks ?? [];
  }

  static create(data) {
    data.checks = data.check_codes.map(code => {
      return game.groupCheck.system.checkDataForAction(code);
    });
    GroupCheck._log_creation(data.checks);
    return new GroupCheck(data);
  }

  static fromMessage(message) {
    let data = message.getFlag(constants.moduleName, DATA_FLAG);
    if (!data) return;
    return new GroupCheck(data);
  }

//   average() {
//     if (this.result.length == 0) return Number.NAN;
// 
//     const reducer = ( acc, cur ) => acc + cur.result;
//     let total = this.results.reduce(reducer, 0);
//     return total / this.result.length;
//   }
// 
//   formattedAverage() {
//     let average = this.average();
//     if (average == Number.NAN) {
//       return 'N/A';
//     } else {
//       return average;
//     }
//   }

  static _log_creation(checks) {
    let check_string = checks.map(check => game.i18n.localize(check.label)).join(', ');
    log(`Created Group Check for: ${check_string}`);
  }
}

class GroupCheckResult {
  constructor(actor, player, roll) {
    this._actorId = actor._id;
    this.actor = {
      _id: actor._id,
      name: actor.name,
      img: actor.img
    };

    this._playerId = player._id;

    this.roll = roll;
    if (!this.roll.total) {
      this.roll.total = roll._total;
    }
  }

  static create(actor, player, roll) {
    return new GroupCheckResult(actor, player, roll);
  }

  static recreate(data) {
    let actor = game.actors.get(data._actorId);
    let player = game.users.get(data._playerId);
    let roll = Roll.fromData(data.roll);
    return new GroupCheckResult(actor, player, roll);
  }
}

/*
 * When a roll button is clicked:
 * 1. Identify selected tokens
 * 2. Roll check for each selected token within the current system
 * 3. Update results[] with new rolls
 */

export default class GroupCheckCard extends ChatMessage {
  static async create(data, options={}) {
    data = GroupCheck.create(data);
    let message = await renderTemplate(`${constants.templateRoot}/chat-card.html`, data);

    let messageData = {
      content: message
    };

    let messageEntity = await super.create(messageData, options);
    await messageEntity.setFlag(constants.moduleName, IS_GROUP_CHECK_FLAG, true);
    await messageEntity.setFlag(constants.moduleName, DATA_FLAG, data);
    await messageEntity.setFlag(constants.moduleName, RESULTS_FLAG, {});

    return messageEntity;
  }

  static getForId(id) {
    let message = game.messages.get(id);
    return message;
  }

  static async renderGroupCheck(chatMessage) {
    const data = GroupCheck.fromMessage(chatMessage);
    const results = chatMessage.getFlag(constants.moduleName, RESULTS_FLAG) ?? {};
    if (!data) return;

    let renderingData = duplicate(data);
    renderingData.results = results;
    const updatedHtml = await renderTemplate(`${constants.templateRoot}/chat-card.html`, renderingData);
    await chatMessage.update({content: updatedHtml});
  }

  static async rollCheck(action, actor) {
    // TODO: Ensure roll hasn't already occurred for this actor
    log(`Rolling ${action} for ${actor.name}`);
    return game.groupCheck.system.rollCheckForActor(action, actor);
  }

  static async _onButtonClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const action = button.dataset.action;
    const html = button.closest('.group-check');
    const chatMessage = GroupCheckCard.getForId(
      button.closest('.message').dataset.messageId
    );
    // const userId = game.user._id;

    // log(`Button clicked with action ${action}`);

    const actors = GroupCheckCard._getTargetedActors();
    let actorRolls = new Map();
    const roll = await GroupCheckCard.rollCheck(action, actors[0]);
    actorRolls.set(actors[0], roll);

    let rolls = [];
    for (let [actor, roll] of actorRolls) {
      rolls.push([actor, roll.toJSON()]);
    }

    if (chatMessage.isAuthor) {
      GroupCheckCard._updateCardWithRolls(chatMessage, rolls, game.user.id);
    } else {
      GroupCheckCard._emitRolls(chatMessage._id, rolls);
    }

    // log(`Roll: ${roll.results} = ${roll.total}`);

    // const rollResults = Promise.allSettled(
    //   GroupCheckCard._getTargetedActors().map(actor => {
    //     GroupCheckCard.rollCheck(messageId, action, actor)
    //   })
    // ).then(value => {
    //   GroupCheckCard._updateCardWithRolls(null, value);
    // });

    button.disabled = false;
  }

  static async _emitRolls(messageId, rolls) {
    game.socket.emit(constants.socket, {
      operation: 'sendActorRolls',
      user: game.user.id,
      content: {
        messageId: messageId,
        rolls: rolls
      }
    });
  }

  static async _receiveRolls(data, userId) {
    const chatMessage = game.messages.find(entry => entry._id === data.messageId);
    if (!chatMessage) {
      log('Message could not be found');
      return;
    }
    if (!chatMessage.isAuthor) return;

    GroupCheckCard._updateCardWithRolls(chatMessage, data.rolls, userId);
  }

  static async _updateCardWithRolls(chatMessage, rolls, userId) {
    let results = duplicate(chatMessage.getFlag(constants.moduleName, RESULTS_FLAG));
    if (!results) {
      log('Could not load data for group check');
      return;
    }
    let user = game.users.get(userId);

    for (let [actor, roll] of rolls) {
      log(`${actor.name} rolled a ${roll.total}`);
      results[actor._id] = GroupCheckResult.create(actor, user, roll);
    }

    await chatMessage.setFlag(constants.moduleName, RESULTS_FLAG, results);
    await GroupCheckCard.renderGroupCheck(chatMessage);
  };

  static _getTargetedActors() {
    // Retrieve actors for all selected tokens
    // If no tokens are selected, retrieve user's default actor
    // If still no actors, throw an error
    let actors = [];
    actors.push(game.user.character);
    return actors;
  }
};

export function chatListeners(html) {
  html.off('click', '.group-check-buttons button');
  html.on('click', '.group-check-buttons button', GroupCheckCard._onButtonClick);
};
