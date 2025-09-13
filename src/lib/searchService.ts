import {
  supportUsers,
  helpdeskTickets,
  helpdeskKnowledgeBase,
  ticketTasks,
  ticketEvents
} from '@/data/mockData';

export interface SearchResult {
  id: string;
  type: 'user' | 'ticket' | 'article' | 'task' | 'event';
  title: string;
  description: string;
  url: string;
  relevance: number;
}

export const searchAll = (query: string): SearchResult[] => {
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  // Search users
  supportUsers.forEach(user => {
    const relevance = calculateRelevance(lowerQuery, [
      user.name || '',
      user.role || '',
      user.department || '',
      user.email || ''
    ]);
    
    if (relevance > 0) {
      results.push({
        id: user.id,
        type: 'user',
        title: user.name,
        description: `${user.role} • ${user.department || 'No Department'}`,
        url: `/users`,
        relevance
      });
    }
  });

  // Search tickets
  helpdeskTickets.forEach(ticket => {
    const relevance = calculateRelevance(lowerQuery, [
      ticket.title || '',
      ticket.description || '',
      ticket.category || '',
      ticket.status || '',
      ticket.priority || ''
    ]);
    
    if (relevance > 0) {
      results.push({
        id: ticket.id,
        type: 'ticket',
        title: ticket.title,
        description: `${ticket.category} • ${ticket.status} • ${ticket.priority} priority`,
        url: `/tickets`,
        relevance
      });
    }
  });

  // Search knowledge base articles
  helpdeskKnowledgeBase.forEach(article => {
    const relevance = calculateRelevance(lowerQuery, [
      article.title || '',
      article.content || '',
      article.category || ''
    ]);
    
    if (relevance > 0) {
      results.push({
        id: article.id,
        type: 'article',
        title: article.title,
        description: `${article.category} • ${article.views} views`,
        url: `/knowledge-base`,
        relevance
      });
    }
  });

  // Search tasks
  ticketTasks.forEach(task => {
    const relevance = calculateRelevance(lowerQuery, [
      task.title,
      task.description,
      task.status,
      task.priority
    ]);
    
    if (relevance > 0) {
      results.push({
        id: task.id,
        type: 'task',
        title: task.title,
        description: `${task.status} • ${task.priority} priority • ${task.progress}% complete`,
        url: `/tasks`,
        relevance
      });
    }
  });

  // Search events
  ticketEvents.forEach(event => {
    const relevance = calculateRelevance(lowerQuery, [
      event.title,
      event.description || '',
      event.type,
      event.priority
    ]);
    
    if (relevance > 0) {
      results.push({
        id: event.id,
        type: 'event',
        title: event.title,
        description: `${event.type.replace('-', ' ')} • ${event.priority} priority`,
        url: `/calendar`,
        relevance
      });
    }
  });

  // Sort by relevance and return top results
  return results
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 10);
};

const calculateRelevance = (query: string, searchableTexts: string[]): number => {
  let relevance = 0;
  
  searchableTexts.forEach(text => {
    if (!text) return; // Skip undefined/null values
    const lowerText = text.toLowerCase();
    
    // Exact match gets highest score
    if (lowerText === query) {
      relevance += 100;
    }
    // Starts with query gets high score
    else if (lowerText.startsWith(query)) {
      relevance += 50;
    }
    // Contains query gets medium score
    else if (lowerText.includes(query)) {
      relevance += 25;
    }
    // Word boundary match gets lower score
    else {
      const words = query.split(' ');
      words.forEach(word => {
        if (lowerText.includes(word)) {
          relevance += 10;
        }
      });
    }
  });
  
  return relevance;
};
