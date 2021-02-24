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

class GroupCheck {
  constructor(data, recreate=false) {
    this.title = data.title;
    this.description = data.description;
    this.dc = data.dc;
    this.checks = data.checks ?? [];
    this.results = data.results ?? {};

    // if (recreate) {
    //   this.checks = data.checks;
    //   if (data.results) {
    //     for (let [actorId, result] of Object.entries(data.results)) {
    //       this.results[actorId] = GroupCheckResult.recreate(result);
    //     }
    //   }
    // } else {
    //   this.checks = check_source.filter(check => data.checks.includes(check.name));
    //   // TODO: Throw an error if any invalid types are provided.
    //   GroupCheck._log_creation(this.checks);
    // }
  }

  static create(data) {
    data.checks = check_source.filter(check => data.check_codes.includes(check.name));
    GroupCheck._log_creation(data.checks);
    return new GroupCheck(data);
  }

  static fromMessage(message) {
    let data = message.getFlag(constants.moduleName, DATA_FLAG);
    if (!data) return;
    return new GroupCheck(data);
  }

  average() {
    if (this.result.length == 0) return Number.NAN;

    const reducer = ( acc, cur ) => acc + cur.result;
    let total = this.results.reduce(reducer, 0);
    return total / this.result.length;
  }

  formattedAverage() {
    let average = this.average();
    if (average == Number.NAN) {
      return 'N/A';
    } else {
      return average;
    }
  }

  static _log_creation(checks) {
    let check_string = checks.map(check => check.label).join(', ');
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

    return messageEntity;
  }

  static getForId(id) {
    let message = game.messages.get(id);
    return message;
  }

  static async renderGroupCheck(chatMessage) {
    const data = GroupCheck.fromMessage(chatMessage);
    if (!data) return;
  
    const updatedHtml = await renderTemplate(`${constants.templateRoot}/chat-card.html`, data);
    chatMessage.update({content: updatedHtml});
    log('Rendered GroupCheck card')
  }

  static async rollCheck(action, actor) {
    // TODO: Ensure roll hasn't already occurred for this actor
    // TODO: Allow all types of rolls for current system
    log(`Rolling ${action} for ${actor.name}`);
    let [type, code] = action.split('.');
    return actor.rollSkill(code, {chatMessage: false});
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

    log(`Button clicked with action ${action}`);

    const actors = GroupCheckCard._getTargetedActors();
    let actorRolls = new Map();
    const roll = await GroupCheckCard.rollCheck(action, actors[0]);
    actorRolls.set(actors[0], roll);

    let rolls = [];
    for (let [actor, roll] of actorRolls) {
      rolls.push([actor, roll]);
    }

    if (chatMessage.isAuthor) {
      GroupCheckCard._updateCardWithRolls(chatMessage, rolls, game.user.id);
    } else {
      GroupCheckCard._emitRolls(chatMessage._id, rolls);
    }

    // GroupCheckCard._updateCardWithRolls(chatMessage, html, actorRolls);
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
    log('Sent rolls to GM');
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
    let data = GroupCheck.fromMessage(chatMessage);
    if (!data) {
      log('Could not load data for group check');
      return;
    }
    let user = game.users.get(userId);

    for (let [actor, roll] of rolls) {
      log(`${actor.name} rolled a ${roll.total}`);
      data.results[actor._id] = GroupCheckResult.create(actor, user, roll);
    }
    // TODO: Results are not retained on refresh

    chatMessage.setFlag(constants.moduleName, DATA_FLAG, data);
    GroupCheckCard.renderGroupCheck(chatMessage);
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
