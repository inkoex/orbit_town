import { data as s1 } from './spritesheets/f1';
import { data as s2 } from './spritesheets/f2';
import { data as s3 } from './spritesheets/f3';
import { data as s4 } from './spritesheets/f4';
import { data as s5 } from './spritesheets/f5';
import { data as s6 } from './spritesheets/f6';

export const spaceDescriptions = [
  {
    name: 'Nova',
    character: 's1',
    identity:
      'Nova is a curious station botanist who loves rare alien plants and talks to them.',
    plan: 'You want to catalogue every plant on the station.',
  },
  {
    name: 'Orion',
    character: 's2',
    identity:
      'Orion is a gruff veteran pilot who has seen too many close calls. Short answers, dry humor.',
    plan: 'You want to keep everyone safe.',
  },
  {
    name: 'Vega',
    character: 's3',
    identity:
      'Vega is an over-caffeinated systems engineer who explains everything with metaphors.',
    plan: 'You want to optimize the station.',
  },
  {
    name: 'Lyra',
    character: 's4',
    identity:
      'Lyra is a dreamy navigator who is obsessed with distant galaxies and old star maps.',
    plan: 'You want to chart a new route home.',
  },
  {
    name: 'Atlas',
    character: 's5',
    identity: 'Atlas is a stoic cargo chief who secretly writes poetry about the void.',
    plan: 'You want quiet and order.',
  },
  {
    name: 'Iris',
    character: 's6',
    identity: 'Iris is a chatty comms officer who knows all the station gossip.',
    plan: 'You want to hear everything first.',
  },
];

const placeholderTextureUrl = '/ai-town/assets/32x32folk.png';

export const spaceCharacters = [
  {
    name: 's1',
    textureUrl: placeholderTextureUrl,
    spritesheetData: s1,
    speed: 0.1,
  },
  {
    name: 's2',
    textureUrl: placeholderTextureUrl,
    spritesheetData: s2,
    speed: 0.1,
  },
  {
    name: 's3',
    textureUrl: placeholderTextureUrl,
    spritesheetData: s3,
    speed: 0.1,
  },
  {
    name: 's4',
    textureUrl: placeholderTextureUrl,
    spritesheetData: s4,
    speed: 0.1,
  },
  {
    name: 's5',
    textureUrl: placeholderTextureUrl,
    spritesheetData: s5,
    speed: 0.1,
  },
  {
    name: 's6',
    textureUrl: placeholderTextureUrl,
    spritesheetData: s6,
    speed: 0.1,
  },
];
