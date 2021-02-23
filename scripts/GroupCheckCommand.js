import constants from './shared/constants.js';
import { log } from './shared/messages.js';
import GroupCheck from './GroupCheck.js';

/*
 * Chat command for calling a group check.
 *
 * Name: groupCheck, gc
 * Synopsis: gc skill-code ... [dc]
 *
 * skill-code: One or more commands that players can use for this check.
 * dc: Optional DC to compare each check against.
 */

export default class GroupCheckCommand {
  static registerCommand() {
    Hooks.on('chatMessage', (chatLog, messageText, chatData) => {
      let match = this.checkCommand(messageText);

      if (match) {
        let content = messageText.replace(match[1], '');

        log(`Chat command received: "${content}"`);
        this.createGroupCheck(content);

        return false;
      }
    });
  }

  static checkCommand(messageText) {
    const regex = new RegExp('^(\\/(?:gc|groupcheck) )', 'i');
    return messageText.match(regex);
  }

  static async createGroupCheck(content) {
    let parts = content.trim().split(' ');
    parts = parts.map(s => s.trim());

    let checkDC = undefined;
    if (parts.length > 1) {
      checkDC = Number.parseInt(parts[parts.length - 1]);
      if (checkDC) {
        parts.pop();
      }
    }
    return GroupCheck.create({
      check_codes: parts,
      dc: checkDC
    });
  };
};
