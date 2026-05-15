export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string
          avatar_config: Json
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name: string
          avatar_config?: Json
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string
          avatar_config?: Json
          bio?: string | null
          updated_at?: string
        }
      }
      leagues: {
        Row: {
          id: string
          name: string
          description: string | null
          type: "global" | "public" | "private"
          invite_code: string | null
          config: Json
          created_by: string
          created_at: string
          is_verified: boolean
          max_members: number | null
          banner_color: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          type: "global" | "public" | "private"
          invite_code?: string | null
          config?: Json
          created_by: string
          created_at?: string
          is_verified?: boolean
          max_members?: number | null
          banner_color?: string
        }
        Update: {
          name?: string
          description?: string | null
          type?: "global" | "public" | "private"
          invite_code?: string | null
          config?: Json
          is_verified?: boolean
          max_members?: number | null
          banner_color?: string
        }
      }
      league_members: {
        Row: {
          league_id: string
          user_id: string
          points: number
          rank: number | null
          joined_at: string
          wildcards: Json
        }
        Insert: {
          league_id: string
          user_id: string
          points?: number
          rank?: number | null
          joined_at?: string
          wildcards?: Json
        }
        Update: {
          points?: number
          rank?: number | null
          wildcards?: Json
        }
      }
      matches: {
        Row: {
          id: string
          api_fixture_id: number
          home_team: string
          away_team: string
          home_team_logo: string
          away_team_logo: string
          home_team_code: string
          away_team_code: string
          scheduled_at: string
          status: "scheduled" | "live" | "finished" | "postponed"
          home_score: number | null
          away_score: number | null
          stage: string
          group_name: string | null
          venue: string | null
          minute: number | null
          extra_data: Json
        }
        Insert: {
          id?: string
          api_fixture_id: number
          home_team: string
          away_team: string
          home_team_logo: string
          away_team_logo: string
          home_team_code: string
          away_team_code: string
          scheduled_at: string
          status?: "scheduled" | "live" | "finished" | "postponed"
          home_score?: number | null
          away_score?: number | null
          stage: string
          group_name?: string | null
          venue?: string | null
          minute?: number | null
          extra_data?: Json
        }
        Update: {
          status?: "scheduled" | "live" | "finished" | "postponed"
          home_score?: number | null
          away_score?: number | null
          minute?: number | null
          extra_data?: Json
        }
      }
      qualifier_matches: {
        Row: {
          id: string
          api_fixture_id: number
          confederation: string
          league_round: string | null
          home_team: string
          away_team: string
          home_team_logo: string | null
          away_team_logo: string | null
          home_team_code: string | null
          away_team_code: string | null
          scheduled_at: string
          status: "scheduled" | "live" | "finished" | "postponed"
          home_score: number | null
          away_score: number | null
          venue: string | null
          extra_data: Json
          synced_at: string
        }
        Insert: {
          id?: string
          api_fixture_id: number
          confederation: string
          league_round?: string | null
          home_team: string
          away_team: string
          home_team_logo?: string | null
          away_team_logo?: string | null
          home_team_code?: string | null
          away_team_code?: string | null
          scheduled_at: string
          status?: "scheduled" | "live" | "finished" | "postponed"
          home_score?: number | null
          away_score?: number | null
          venue?: string | null
          extra_data?: Json
          synced_at?: string
        }
        Update: {
          status?: "scheduled" | "live" | "finished" | "postponed"
          home_score?: number | null
          away_score?: number | null
          extra_data?: Json
          synced_at?: string
        }
      }
      predictions: {
        Row: {
          id: string
          user_id: string
          match_id: string
          league_id: string
          home_score_pred: number
          away_score_pred: number
          advanced_picks: Json
          points_wagered: number
          points_earned: number | null
          wildcard_used: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          match_id: string
          league_id: string
          home_score_pred: number
          away_score_pred: number
          advanced_picks?: Json
          points_wagered?: number
          points_earned?: number | null
          wildcard_used?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          home_score_pred?: number
          away_score_pred?: number
          advanced_picks?: Json
          points_wagered?: number
          points_earned?: number | null
          wildcard_used?: string | null
          updated_at?: string
        }
      }
      bracket_predictions: {
        Row: {
          id: string
          user_id: string
          league_id: string
          bracket_data: Json
          points_earned: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          league_id: string
          bracket_data: Json
          points_earned?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          bracket_data?: Json
          points_earned?: number
          updated_at?: string
        }
      }
      badges: {
        Row: {
          id: string
          user_id: string
          badge_type: string
          earned_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          user_id: string
          badge_type: string
          earned_at?: string
          metadata?: Json
        }
        Update: never
      }
      reactions: {
        Row: {
          id: string
          user_id: string
          prediction_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          prediction_id: string
          emoji: string
          created_at?: string
        }
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type League = Database["public"]["Tables"]["leagues"]["Row"]
export type LeagueMember = Database["public"]["Tables"]["league_members"]["Row"]
export type Match = Database["public"]["Tables"]["matches"]["Row"]
export type QualifierMatch = Database["public"]["Tables"]["qualifier_matches"]["Row"]
export type Prediction = Database["public"]["Tables"]["predictions"]["Row"]
export type BracketPrediction = Database["public"]["Tables"]["bracket_predictions"]["Row"]
export type Badge = Database["public"]["Tables"]["badges"]["Row"]
export type Reaction = Database["public"]["Tables"]["reactions"]["Row"]

// El AvatarConfig nuevo vive en @/lib/avatar (DiceBear). Este tipo se mantiene
// solo por retro-compatibilidad si quedan registros viejos.
export type LegacyAvatarConfig = {
  skin?: string
  hair?: string
  hairColor?: string
  jersey?: string
  jerseyColor?: string
  accessory?: string | null
}

export type LeagueConfig = {
  advancedOptions: {
    enabled: boolean
    firstScorer: boolean
    goalMinute: boolean
    yellowCards: boolean
    redCards: boolean
    corners: boolean
    firstTeamToScore: boolean
    halftimeResult: boolean
    possession: boolean
    totalShots: boolean
    totalFouls: boolean
  }
  multipliers: {
    exactScore: number
    correctWinner: number
    correctDraw: number
    winnerWithDiff: number
  }
  allowWildcards: boolean
  allowBracketChallenge: boolean
}

export type AdvancedPicks = {
  firstScorer?: string
  firstTeamToScore?: "home" | "away"
  goalMinute?: string  // "0-15", "16-30", ...
  halftimeResult?: string  // "1-0", "0-0", ...
  totalYellowCards?: string  // "4-6", "7-9", ...
  anyRedCard?: "yes" | "no"
  totalCorners?: string  // "0-7", "8-12", ...
  morePossession?: "home" | "away"
  totalShots?: string  // "10-19", "20-29", ...
  totalFouls?: string  // "10-19", "20-29", ...
}

export type WildcardType = "todo_o_nada" | "escudo" | "ladron"

export type Wildcards = {
  todo_o_nada: { total: number; used: number }
  escudo: { total: number; used: number }
  ladron: { total: number; used: number }
}
