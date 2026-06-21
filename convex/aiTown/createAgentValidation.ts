import {
  AGENT_IDENTITY_MAX,
  AGENT_NAME_MAX,
  AGENT_PLAN_MAX,
  MAX_AGENTS,
} from '../constants';

export interface CustomAgentArgs {
  name: string;
  character: string;
  identity: string;
  plan: string;
}

export function validateCustomAgent(
  args: CustomAgentArgs,
  ctx: { existingNames: string[]; agentCount: number; validCharacters: string[] },
): void {
  const name = args.name?.trim() ?? '';
  if (name.length < 1 || name.length > AGENT_NAME_MAX) {
    throw new Error(`Agent name must be 1-${AGENT_NAME_MAX} characters.`);
  }
  if (ctx.existingNames.some((existingName) => existingName.toLowerCase() === name.toLowerCase())) {
    throw new Error(`An agent named "${name}" already exists.`);
  }
  if (!ctx.validCharacters.includes(args.character)) {
    throw new Error(`Invalid character: ${args.character}`);
  }

  const identity = args.identity?.trim() ?? '';
  if (identity.length < 1 || identity.length > AGENT_IDENTITY_MAX) {
    throw new Error(`Agent identity must be 1-${AGENT_IDENTITY_MAX} characters.`);
  }
  if ((args.plan?.length ?? 0) > AGENT_PLAN_MAX) {
    throw new Error(`Agent plan must be at most ${AGENT_PLAN_MAX} characters.`);
  }
  if (ctx.agentCount >= MAX_AGENTS) {
    throw new Error(`Max agents (${MAX_AGENTS}) reached.`);
  }
}

export function normalizeCustomAgent(args: CustomAgentArgs): CustomAgentArgs {
  return {
    name: args.name.trim(),
    character: args.character,
    identity: args.identity.trim(),
    plan: (args.plan ?? '').trim(),
  };
}

export interface CreateAgentArgs {
  descriptionIndex?: number;
  custom?: CustomAgentArgs;
}

export function resolveAgentSpec(
  args: CreateAgentArgs,
  ctx: {
    descriptions: CustomAgentArgs[];
    existingNames: string[];
    agentCount: number;
    validCharacters: string[];
  },
): CustomAgentArgs {
  const hasIndex = args.descriptionIndex !== undefined;
  const hasCustom = args.custom !== undefined;
  if (hasIndex === hasCustom) {
    throw new Error('createAgent requires exactly one of descriptionIndex or custom');
  }

  if (hasCustom) {
    const normalized = normalizeCustomAgent(args.custom!);
    validateCustomAgent(normalized, {
      existingNames: ctx.existingNames,
      agentCount: ctx.agentCount,
      validCharacters: ctx.validCharacters,
    });
    return normalized;
  }

  const index = args.descriptionIndex!;
  if (!Number.isInteger(index) || index < 0 || index >= ctx.descriptions.length) {
    throw new Error(`Invalid descriptionIndex: ${index}`);
  }
  const description = ctx.descriptions[index];
  return {
    name: description.name,
    character: description.character,
    identity: description.identity,
    plan: description.plan,
  };
}
