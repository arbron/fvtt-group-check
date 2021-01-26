import constants from './shared/constants.js';
import { log } from './shared/messages.js';

/*
 * GroupCheck.data
 *
 * title: string?       - Title to display at the top of the chat box.
 * description: string? - Description to display to players.
 * checks: [string]     - Valid ability checks for players to perform.
 * dc: Number?          - DC to compare each check against.
 *
 * results: [GroupCheckResult] - Array of results from players.
 */

const check_source = [
  { "name": "acr", "label": "Acrobatics", "type": "skill", "localization": "DND5E.SkillAcr" },
  { "name": "ani", "label": "Animal Handling", "type": "skill", "localization": "DND5E.SkillAni" }
];

class GroupCheckData {
  constructor(data) {
    this.title = data.title;
    this.description = data.description;

    this.checks = check_source.filter(check => data.checks.includes(check.name));
    // TODO: Throw an error if any invalid types are provided.

    this.dc = data.dc;
    this.results = [];

    GroupCheckData._log_creation(this.checks);
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

/*
 * When a roll button is clicked:
 * 1. Identify selected tokens
 * 2. Roll check for each selected token within the current system
 * 3. Update results[] with new rolls
 */

export default class GroupCheck extends ChatMessage {
  static async create(data, options={}) {
    data = new GroupCheckData(data);
    let message = await renderTemplate(`${constants.templateRoot}/chat-card.html`, data);

    let messageData = {
      content: message
    };

    let messageEntity = await super.create(messageData, options);
    await messageEntity.setFlag(constants.moduleName, 'isGroupCheck', true);
    await messageEntity.setFlag(constants.moduleName, 'groupCheckData', data);

    return messageEntity;
  }

  static async renderGroupCheck(chatMessage, html, listeners = true) {
    $(html).addClass('group-check');
    let data = chatMessage.getFlag(constants.moduleName, 'groupCheckData');
    if (!data) return;

    // Update data with new results

    let updatedHtml = await renderTemplate(`${constants.templateRoot}/chat-card.html`, data);
    $(html).find('.group-check-card').html(updatedHtml);

    chatListeners(html);
  }

  static async rollCheck(id, action, actor) {
    log(`Rolling ${action} for <<actor>>`);
    let [type, code] = action.split('.');
    actor.rollSkill(code);
  }

  static async _onButtonClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const action = button.dataset.action;
    const { messageId } = button.closest('.message').dataset;
    // const userId = game.user._id;

    log(`Button clicked with action ${action}`);

    let actors = GroupCheck._getTargetedActors();
    for (let actor of actors) {
      GroupCheck.rollCheck(messageId, action, actor);
    }

    button.disabled = false;
  }

  static _getTargetedActors() {
    // Fake code
    let actors = [];
    actors.push(game.user.character);
    return actors;
  }
};

export function chatListeners(html) {
  html.on('click', '.group-check-buttons button', GroupCheck._onButtonClick);
};
