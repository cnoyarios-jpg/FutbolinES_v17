import { useState } from 'react';
import { 
  TIERED_ACHIEVEMENTS, 
  CATEGORY_LABELS, 
  CATEGORY_ICONS, 
  calculateLevel, 
  getNextThreshold, 
  getProgressPercentage, 
  getTierName, 
  getTierColor,
  AchievementCategory,
  PlayerTieredAchievement 
} from '@/types/achievements';
import { getPlayerTieredAchievements, MOCK_RANKINGS } from '@/data/mock';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AchievementsSectionProps {
  userId: string;
}

export default function AchievementsSection({ userId }: AchievementsSectionProps) {
  const [expandedCategory, setExpandedCategory] = useState<AchievementCategory | null>(null);
  const playerAchievements = getPlayerTieredAchievements(userId);
  const ranking = MOCK_RANKINGS.find(r => r.userId === userId);

  // Get computed value for each achievement based on player stats
  const getComputedValue = (achievementId: string): number => {
    if (!ranking) return 0;
    
    switch (achievementId) {
      case 'matches_played':
      case 'matches_won':
        return ranking.wins + ranking.losses;
      case 'tournaments_played':
        return ranking.tournamentsPlayed || 0;
      case 'tournaments_won':
        return ranking.tournamentsWon || 0;
      case 'win_streak':
        return ranking.bestStreak || 0;
      case 'mvp_count':
        return ranking.mvpCount || 0;
      case 'elo_milestones':
        return ranking.general || 0;
      case 'wins_as_goalkeeper':
        return Math.floor((ranking.wins || 0) / 2); // Approximate
      case 'wins_as_forward':
        return Math.floor((ranking.wins || 0) / 2); // Approximate
      default:
        // Check stored progress
        const stored = playerAchievements.find(a => a.achievementId === achievementId);
        return stored?.currentValue || 0;
    }
  };

  const categories = [...new Set(TIERED_ACHIEVEMENTS.map(a => a.category))] as AchievementCategory[];

  const getCategoryStats = (category: AchievementCategory) => {
    const categoryAchievements = TIERED_ACHIEVEMENTS.filter(a => a.category === category);
    let totalTiers = 0;
    let unlockedTiers = 0;
    
    categoryAchievements.forEach(def => {
      totalTiers += def.tiers.length;
      const value = getComputedValue(def.id);
      unlockedTiers += calculateLevel(value, def.tiers);
    });
    
    return { totalTiers, unlockedTiers, percentage: totalTiers > 0 ? Math.round((unlockedTiers / totalTiers) * 100) : 0 };
  };

  return (
    <div className="mt-4 rounded-xl bg-card p-4 shadow-card">
      <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-1.5">
        🏅 Logros
      </h3>
      
      <div className="flex flex-col gap-2">
        {categories.map(category => {
          const stats = getCategoryStats(category);
          const isExpanded = expandedCategory === category;
          const categoryAchievements = TIERED_ACHIEVEMENTS.filter(a => a.category === category);
          
          return (
            <div key={category} className="rounded-lg bg-muted overflow-hidden">
              <button 
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/80 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{CATEGORY_ICONS[category]}</span>
                  <span className="font-semibold text-sm">{CATEGORY_LABELS[category]}</span>
                  <span className="text-xs text-muted-foreground">({stats.unlockedTiers}/{stats.totalTiers})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16">
                    <Progress value={stats.percentage} className="h-1.5" />
                  </div>
                  <span className="text-xs text-muted-foreground">{stats.percentage}%</span>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>
              
              {isExpanded && (
                <div className="px-3 pb-3 flex flex-col gap-2">
                  {categoryAchievements.map(def => {
                    const value = getComputedValue(def.id);
                    const level = calculateLevel(value, def.tiers);
                    const nextThreshold = getNextThreshold(value, def.tiers);
                    const progress = getProgressPercentage(value, def.tiers);
                    const isComplete = level >= def.tiers.length;
                    
                    return (
                      <div key={def.id} className="rounded-lg bg-background p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{def.icon}</span>
                            <span className="text-xs font-semibold">{def.name}</span>
                            {level > 0 && (
                              <span className={`text-[10px] font-bold ${getTierColor(level)}`}>
                                {getTierName(level)}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Nv. {level}/{def.tiers.length}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-1.5">{def.description}</p>
                        <div className="flex items-center gap-2">
                          <Progress value={isComplete ? 100 : progress} className="h-1.5 flex-1" />
                          <span className="text-[10px] text-muted-foreground min-w-[50px] text-right">
                            {value}{nextThreshold ? ` / ${nextThreshold}` : ' ✓'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
