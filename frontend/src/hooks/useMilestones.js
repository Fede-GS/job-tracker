import { useCallback } from 'react';

const MILESTONES = [
  { count: 1,  icon: 'rocket_launch',        titleKey: 'milestones.first',      messageKey: 'milestones.firstMsg' },
  { count: 5,  icon: 'local_fire_department', titleKey: 'milestones.five',       messageKey: 'milestones.fiveMsg' },
  { count: 10, icon: 'star',                  titleKey: 'milestones.ten',        messageKey: 'milestones.tenMsg' },
  { count: 25, icon: 'emoji_events',          titleKey: 'milestones.twentyFive', messageKey: 'milestones.twentyFiveMsg' },
  { count: 50, icon: 'military_tech',         titleKey: 'milestones.fifty',      messageKey: 'milestones.fiftyMsg' },
];

export function useMilestones() {
  const checkMilestone = useCallback((newTotal) => {
    const seen = JSON.parse(localStorage.getItem('jt-milestones-seen') || '[]');
    const milestone = MILESTONES.find((m) => m.count === newTotal && !seen.includes(m.count));
    if (milestone) {
      localStorage.setItem('jt-milestones-seen', JSON.stringify([...seen, milestone.count]));
    }
    return milestone || null;
  }, []);

  return { checkMilestone };
}
