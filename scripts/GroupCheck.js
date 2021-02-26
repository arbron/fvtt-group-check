import constants from './shared/constants.js';
import { log, uiError } from './shared/messages.js';

// Generic Check Types:
// - Formula: DM enters roll formula that is rolled for each player
// - Manual: Players can enter a result manually

export default class GroupCheck {
  static async create(data, options={}) {
    data = GroupCheck._prepareData(data);

    const content = await renderTemplate(`${constants.templateRoot}/chat-card.html`, data);
    let chatMessage = await ChatMessage.create({content: content}, options);

    await chatMessage.setFlag(constants.moduleName, 'isGroupCheck', true);
    await chatMessage.setFlag(constants.moduleName, 'title', data.title);
    await chatMessage.setFlag(constants.moduleName, 'description', data.description);
    await chatMessage.setFlag(constants.moduleName, 'checks', data.checks);
    await chatMessage.setFlag(constants.moduleName, 'dc', data.dc);
    await chatMessage.setFlag(constants.moduleName, 'results', {});

    const check_string = data.checks.map(check => check.label).join(', ');
    log(`Created Group Check for: ${check_string}`);

    return chatMessage;
  }

  static _prepareData(data) {
    data.title = data.title ?? 'Group Check';
    data.checks = data.check_codes.map(code => {
      return game.groupCheck.system.checkDataForAction(code);
    });

    return data;
  }

  static async render(chatMessage) {
    let data = {
      title:       chatMessage.getFlag(constants.moduleName, 'title'),
      description: chatMessage.getFlag(constants.moduleName, 'description'),
      checks:      chatMessage.getFlag(constants.moduleName, 'checks'),
      dc:          chatMessage.getFlag(constants.moduleName, 'dc'),
      results:     chatMessage.getFlag(constants.moduleName, 'results')
    };
    data.average = GroupCheck._average(data.results);
    data.showAverage = true;

    const updatedHtml = await renderTemplate(`${constants.templateRoot}/chat-card.html`, data);
    await chatMessage.update({content: updatedHtml});
  }

  static _average(results={}) {
    let accumulator = 0;
    let count = 0;
    for (let [id, result] of Object.entries(results)) {
      accumulator += result.roll.total;
      count += 1;
    }
    if (count == 0) return 'N/A';
    return Math.floor(accumulator / count * 10) / 10;
  }


  /*****************************/
  /*      Rolling Checks       */
  /*****************************/
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
    const chatMessage = game.messages.get(
      button.closest('.message').dataset.messageId
    );

    const actors = GroupCheck._getTargetedActors();
    if (!actors) {
      button.disabled = false;
      return;
    }

    let rolls = [];
    for (let actor of actors) {
      const roll = await GroupCheck.rollCheck(action, actor);
      if (roll) rolls.push([actor, roll.toJSON()]);
    }
    // TODO (maybe): Update card after each roll rather than all at once

    if (chatMessage.isAuthor) {
      GroupCheck._updateResults(chatMessage, rolls, game.user.id);
    } else {
      GroupCheck._emitRolls(chatMessage._id, rolls);
    }

    button.disabled = false;
  }

  static _getTargetedActors() {
    let actors = [];
    for (let token of canvas.tokens.controlled) {
      actors.push(token.actor);
    }
    if (actors.length == 0 && game.user.character) actors.push(game.user.character);
    if (actors.length == 0) {
      uiError('GroupCheck.NoActorsAvailable', /* toConsole */ false);
    }
    return actors;
  }

  static async _updateResults(chatMessage, rolls, userId) {
    let results = duplicate(chatMessage.getFlag(constants.moduleName, 'results'));
    if (!results) {
      log('Could not load data for group check');
      return;
    }
    let user = game.users.get(userId);

    for (let [actor, roll] of rolls) {
      log(`${actor.name} rolled a ${roll.total}`);
      results[actor._id] = GroupCheck._formatResult(actor, user, roll);
    }

    await chatMessage.setFlag(constants.moduleName, 'results', results);
    await GroupCheck.render(chatMessage);
  }

  static _formatResult(actor, player, roll) {
    return {
      actor: {
        id: actor._id,
        name: actor.name,
        img: actor.img
      },
      player: {
        id: player._id,
        name: player.name
      },
      roll: roll
    }
  }


  /*****************************/
  /*   Socket Communication    */
  /*****************************/
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

  static async receiveRolls(data, userId) {
    const chatMessage = game.messages.find(entry => entry._id === data.messageId);
    if (!chatMessage) {
      log('Message could not be found');
      return;
    }
    if (!chatMessage.isAuthor) return;

    GroupCheck._updateResults(chatMessage, data.rolls, userId);
  }
};

export function chatListeners(html) {
  html.off('click', '.group-check-buttons button');
  html.on('click', '.group-check-buttons button', GroupCheck._onButtonClick);
};
