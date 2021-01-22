import constants from './shared/constants.js';

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

class GroupCheckData {
  constructor(data) {
    this.title = data.title;
    this.description = data.description;
    this.checks = data.checks;
    this.dc = data.dc;

    // TODO: Validate checks against current system.

    this.results = [];
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
}

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
  };

  static async renderGroupCheck(chatMessage, html, listeners = true) {
    
  };

  static async rollCheck(id, ability, user) {
    
  };
};
