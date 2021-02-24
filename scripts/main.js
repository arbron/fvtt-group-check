import constants from './shared/constants.js';
import { log } from './shared/messages.js';
import { loadSystem } from './systems/core.js';
// import registerSettings from './settings.js';
import GroupCheck from './GroupCheck.js';
import { chatListeners } from './GroupCheck.js';
import GroupCheckCommand from './GroupCheckCommand.js';

const preloadTemplates = () => {
  const templatePaths = [
    `${constants.templateRoot}/chat-card.html`,
  ];
  return loadTemplates(templatePaths);
};

Hooks.on('init', () => {
  log('Initializing the Group Checks module');

  GroupCheckCommand.registerCommand();

  // Create a namespace within the game global
  game.groupCheck = {
    system: undefined
  };

  // registerSettings();
  preloadTemplates();
});

Hooks.on('setup', () => {
  loadSystem();

  Hooks.on('renderChatMessage', (chatMessage, html, messageData) => {
    let isGroupCheck = chatMessage.getFlag(constants.moduleName, 'isGroupCheck');

    if (isGroupCheck) {
      chatListeners(html);
      return false;
    }
  });

  game.socket.on(constants.socket, (data) => {
    log('Received socket message');
    switch (data.operation) {
      case 'sendActorRolls':
        GroupCheck.receiveRolls(data.content, data.user);
        break;
      default:
        return;
    }
  });
});
