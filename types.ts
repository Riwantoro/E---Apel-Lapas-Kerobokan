export enum Sender {
  USER = 'user',
  BOT = 'bot'
}

export enum EmoteType {
  NEUTRAL = 'NEUTRAL',
  SMILE = 'SMILE',
  SERIOUS = 'SERIOUS',
  BOW = 'BOW'
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  currentEmote: EmoteType;
}