use anchor_lang::prelude::*;

declare_id!("AeG11FkUrYGQ1xcJy74bBFqzyqUALcQgTeTzFrmHKWCP");

#[program]
pub mod workspace {
    use super::*;

    // fee_bps: u16, Platform fee in basis points, 250 = 2.5%
    // treasury: Pubkey, Treasury address for fee collection, 9PJ8I...3555
    // max_agents_per_user: u8, Maximum agents a user can create, 5
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        fee_bps: u16,
        treasury: Pubkey,
        max_agents_per_user: u8,
    ) -> Result<()> {
        require!(fee_bps <= 10000, ErrorCode::InvalidParameter);
        require!(max_agents_per_user > 0 && max_agents_per_user <= 10, ErrorCode::InvalidParameter);

        let config = &mut ctx.accounts.config;
        config.bump = ctx.bumps.config;
        config.authority = ctx.accounts.authority.key();
        config.is_active = true;
        config.is_paused = false;
        config.fee_bps = fee_bps;
        config.treasury = treasury;
        config.max_agents_per_user = max_agents_per_user;
        config.total_agents = 0;
        config.total_interactions = 0;
        config.version = 1;
        Ok(())
    }

    pub fn update_config(
        ctx: Context<UpdateConfig>,
        fee_bps: u16,
        treasury: Pubkey,
        max_agents_per_user: u8,
        is_paused: bool,
    ) -> Result<()> {
        require!(fee_bps <= 10000, ErrorCode::InvalidParameter);
        require!(max_agents_per_user > 0 && max_agents_per_user <= 10, ErrorCode::InvalidParameter);

        let config = &mut ctx.accounts.config;
        config.fee_bps = fee_bps;
        config.treasury = treasury;
        config.max_agents_per_user = max_agents_per_user;
        config.is_paused = is_paused;
        Ok(())
    }

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        agent_nonce: u64,
        name: String,
        personality_hash: [u8; 32],
        spending_limit: u64,
        daily_limit: u64,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(config.is_active && !config.is_paused, ErrorCode::ConfigInactive);
        require!(name.len() > 0 && name.len() <= 32, ErrorCode::InvalidParameter);
        require!(spending_limit > 0, ErrorCode::InvalidAmount);
        require!(daily_limit >= spending_limit, ErrorCode::InvalidAmount);

        let owner_key = ctx.accounts.owner.key();
        let clock = Clock::get()?;

        let agent = &mut ctx.accounts.agent;
        agent.bump = ctx.bumps.agent;
        agent.owner = owner_key;
        agent.agent_nonce = agent_nonce;
        agent.name = name;
        agent.personality_hash = personality_hash;
        agent.spending_limit = spending_limit;
        agent.daily_limit = daily_limit;
        agent.daily_spent = 0;
        agent.last_reset_day = clock.unix_timestamp / 86400;
        agent.total_transactions = 0;
        agent.total_volume = 0;
        agent.is_active = true;
        agent.created_at = clock.unix_timestamp;

        let config = &mut ctx.accounts.config;
        config.total_agents = config.total_agents.checked_add(1).ok_or(ErrorCode::MathOverflow)?;

        Ok(())
    }

    pub fn log_interaction(
        ctx: Context<LogInteraction>,
        interaction_nonce: u64,
        action_type: u8,
        amount: u64,
        description_hash: [u8; 32],
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(config.is_active && !config.is_paused, ErrorCode::ConfigInactive);
        require!(action_type <= 4, ErrorCode::InvalidParameter);

        let agent = &ctx.accounts.agent;
        require!(agent.is_active, ErrorCode::InactiveAccount);

        let clock = Clock::get()?;
        let current_day = clock.unix_timestamp / 86400;

        let agent = &mut ctx.accounts.agent;
        if current_day > agent.last_reset_day {
            agent.daily_spent = 0;
            agent.last_reset_day = current_day;
        }

        if action_type == 1 || action_type == 2 {
            require!(amount <= agent.spending_limit, ErrorCode::SpendingLimitExceeded);
            let new_daily = agent.daily_spent.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
            require!(new_daily <= agent.daily_limit, ErrorCode::DailyLimitExceeded);
            agent.daily_spent = new_daily;
        }

        agent.total_transactions = agent.total_transactions.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
        agent.total_volume = agent.total_volume.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;

        let interaction = &mut ctx.accounts.interaction;
        interaction.bump = ctx.bumps.interaction;
        interaction.agent = ctx.accounts.agent.key();
        interaction.owner = ctx.accounts.owner.key();
        interaction.interaction_nonce = interaction_nonce;
        interaction.action_type = action_type;
        interaction.amount = amount;
        interaction.description_hash = description_hash;
        interaction.timestamp = clock.unix_timestamp;
        interaction.success = true;

        let config = &mut ctx.accounts.config;
        config.total_interactions = config.total_interactions.checked_add(1).ok_or(ErrorCode::MathOverflow)?;

        Ok(())
    }

    pub fn update_agent(
        ctx: Context<UpdateAgent>,
        name: String,
        personality_hash: [u8; 32],
        spending_limit: u64,
        daily_limit: u64,
    ) -> Result<()> {
        require!(name.len() > 0 && name.len() <= 32, ErrorCode::InvalidParameter);
        require!(spending_limit > 0, ErrorCode::InvalidAmount);
        require!(daily_limit >= spending_limit, ErrorCode::InvalidAmount);

        let agent = &mut ctx.accounts.agent;
        agent.name = name;
        agent.personality_hash = personality_hash;
        agent.spending_limit = spending_limit;
        agent.daily_limit = daily_limit;
        Ok(())
    }

    pub fn deactivate_agent(ctx: Context<DeactivateAgent>) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        require!(agent.is_active, ErrorCode::InactiveAccount);
        agent.is_active = false;
        Ok(())
    }

    pub fn reactivate_agent(ctx: Context<ReactivateAgent>) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(config.is_active && !config.is_paused, ErrorCode::ConfigInactive);

        let agent = &mut ctx.accounts.agent;
        require!(!agent.is_active, ErrorCode::AlreadyActive);
        agent.is_active = true;
        Ok(())
    }
}

// ── Account Structs ──

#[account]
pub struct Config {
    pub bump: u8,
    pub authority: Pubkey,
    pub is_active: bool,
    pub is_paused: bool,
    pub fee_bps: u16,
    pub treasury: Pubkey,
    pub max_agents_per_user: u8,
    pub total_agents: u64,
    pub total_interactions: u64,
    pub version: u8,
}

impl Config {
    pub const LEN: usize = 1 + 32 + 1 + 1 + 2 + 32 + 1 + 8 + 8 + 1;
}

#[account]
pub struct Agent {
    pub bump: u8,
    pub owner: Pubkey,
    pub agent_nonce: u64,
    pub name: String,
    pub personality_hash: [u8; 32],
    pub spending_limit: u64,
    pub daily_limit: u64,
    pub daily_spent: u64,
    pub last_reset_day: i64,
    pub total_transactions: u64,
    pub total_volume: u64,
    pub is_active: bool,
    pub created_at: i64,
}

impl Agent {
    pub const LEN: usize = 1 + 32 + 8 + (4 + 32) + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 8;
}

#[account]
pub struct Interaction {
    pub bump: u8,
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub interaction_nonce: u64,
    pub action_type: u8,
    pub amount: u64,
    pub description_hash: [u8; 32],
    pub timestamp: i64,
    pub success: bool,
}

impl Interaction {
    pub const LEN: usize = 1 + 32 + 32 + 8 + 1 + 8 + 32 + 8 + 1;
}

// ── Context Structs ──

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        seeds = [b"config", authority.key().as_ref()],
        bump,
        payer = authority,
        space = 8 + Config::LEN,
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [b"config", authority.key().as_ref()],
        bump = config.bump,
        has_one = authority @ ErrorCode::Unauthorized,
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(agent_nonce: u64)]
pub struct RegisterAgent<'info> {
    #[account(
        mut,
        seeds = [b"config", config.authority.as_ref()],
        bump = config.bump,
        constraint = config.is_active && !config.is_paused @ ErrorCode::ConfigInactive,
    )]
    pub config: Account<'info, Config>,
    #[account(
        init,
        seeds = [b"agent", owner.key().as_ref(), &agent_nonce.to_le_bytes()],
        bump,
        payer = owner,
        space = 8 + Agent::LEN,
    )]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(interaction_nonce: u64)]
pub struct LogInteraction<'info> {
    #[account(
        mut,
        seeds = [b"config", config.authority.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"agent", owner.key().as_ref(), &agent.agent_nonce.to_le_bytes()],
        bump = agent.bump,
        constraint = agent.owner == owner.key() @ ErrorCode::Unauthorized,
    )]
    pub agent: Account<'info, Agent>,
    #[account(
        init,
        seeds = [b"interaction", agent.key().as_ref(), &interaction_nonce.to_le_bytes()],
        bump,
        payer = owner,
        space = 8 + Interaction::LEN,
    )]
    pub interaction: Account<'info, Interaction>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(
        mut,
        seeds = [b"agent", owner.key().as_ref(), &agent.agent_nonce.to_le_bytes()],
        bump = agent.bump,
        constraint = agent.owner == owner.key() @ ErrorCode::Unauthorized,
        constraint = agent.is_active @ ErrorCode::InactiveAccount,
    )]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeactivateAgent<'info> {
    #[account(
        mut,
        seeds = [b"agent", owner.key().as_ref(), &agent.agent_nonce.to_le_bytes()],
        bump = agent.bump,
        constraint = agent.owner == owner.key() @ ErrorCode::Unauthorized,
    )]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct ReactivateAgent<'info> {
    #[account(
        seeds = [b"config", config.authority.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"agent", owner.key().as_ref(), &agent.agent_nonce.to_le_bytes()],
        bump = agent.bump,
        constraint = agent.owner == owner.key() @ ErrorCode::Unauthorized,
    )]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

// ── Error Codes ──

#[error_code]
pub enum ErrorCode {
    #[msg("Math overflow occurred")]
    MathOverflow,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Config is inactive or paused")]
    ConfigInactive,
    #[msg("Account is inactive")]
    InactiveAccount,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid parameter")]
    InvalidParameter,
    #[msg("Transaction exceeds per-transaction spending limit")]
    SpendingLimitExceeded,
    #[msg("Transaction exceeds daily spending limit")]
    DailyLimitExceeded,
    #[msg("Agent is already active")]
    AlreadyActive,
}
