import constants from './shared/constants.js';
import { log } from './shared/messages.js';
// import registerSettings from './settings.js';
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
  // game.group-check = {
  //   
  // };

  // registerSettings();
  preloadTemplates();
});

Hooks.on('setup', () => {
  log('setup');

  Hooks.on('renderChatMessage', (chatMessage, html, messageData) => {
    let isGroupCheck = chatMessage.getFlag(constants.moduleName, 'isGroupCheck');

    if (isGroupCheck) {
      chatListeners(html);
      return false;
    }
  });
});

Hooks.on('ready', () => {
  log('ready');
});

// Hooks.on('renderChatLog', () => {
//   
// });
// 
// Hooks.on('renderChatPopout', () => {
//   
// });
