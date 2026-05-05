import axios from 'axios';
import { logger } from '../utils/logger.js';
import { cacheService } from './cache.js';

// Helper to make authenticated Google API requests
async function makeGoogleRequest(accessToken, url, options = {}) {
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
      ...options
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      logger.warn('Google API returned 401 - token may be expired');
      throw new Error('Token expired');
    }
    logger.error('Google API request failed:', error.message);
    throw error;
  }
}

export const googleServices = {
  /**
   * Fetch Google Calendar events for today and upcoming days
   */
  async getCalendarEvents(accessToken, userId) {
    const cacheKey = `google_${userId}_calendar_events`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const now = new Date();
      const startDate = now.toISOString();
      const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const data = await makeGoogleRequest(
        accessToken,
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          params: {
            timeMin: startDate,
            timeMax: endDate,
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 25
          }
        }
      );

      const events = (data.items || []).map(event => ({
        id: event.id,
        title: event.summary || '(No title)',
        description: event.description || '',
        startTime: event.start.dateTime || event.start.date,
        endTime: event.end.dateTime || event.end.date,
        isAllDay: !event.start.dateTime,
        htmlLink: event.htmlLink
      }));

      cacheService.set(cacheKey, events);
      return events;
    } catch (error) {
      logger.error('Failed to fetch calendar events:', error.message);
      throw error;
    }
  },

  /**
   * Fetch Google Tasks from all task lists
   */
  async getTasks(accessToken, userId) {
    const cacheKey = `google_${userId}_tasks`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // First, get all task lists
      const listsData = await makeGoogleRequest(
        accessToken,
        'https://www.googleapis.com/tasks/v1/users/@me/lists'
      );

      const allTasks = [];

      // Fetch tasks from each list
      for (const list of listsData.items || []) {
        const tasksData = await makeGoogleRequest(
          accessToken,
          `https://www.googleapis.com/tasks/v1/lists/${list.id}/tasks`,
          {
            params: {
              showHidden: false,
              showDeleted: false,
              maxResults: 50
            }
          }
        );

        const tasks = (tasksData.items || []).map(task => ({
          id: task.id,
          listId: list.id,
          listTitle: list.title,
          title: task.title,
          notes: task.notes || '',
          completed: task.status === 'completed',
          dueDate: task.due || null,
          position: task.position,
          selfLink: task.selfLink
        }));

        allTasks.push(...tasks);
      }

      // Sort by due date, then by position
      allTasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return parseInt(a.position || 0) - parseInt(b.position || 0);
      });

      cacheService.set(cacheKey, allTasks);
      return allTasks;
    } catch (error) {
      logger.error('Failed to fetch tasks:', error.message);
      throw error;
    }
  },

  /**
   * Fetch Gmail metadata (unread count, recent messages)
   */
  async getGmailMetadata(accessToken, userId) {
    const cacheKey = `google_${userId}_gmail_metadata`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Get unread count and basic profile
      const profileData = await makeGoogleRequest(
        accessToken,
        'https://www.googleapis.com/gmail/v1/users/me/profile'
      );

      // Get recent messages
      const messagesData = await makeGoogleRequest(
        accessToken,
        'https://www.googleapis.com/gmail/v1/users/me/messages',
        {
          params: {
            maxResults: 10,
            q: 'is:unread'
          }
        }
      );

      const metadata = {
        emailAddress: profileData.emailAddress,
        messagesTotal: profileData.messagesTotal || 0,
        threadsTotal: profileData.threadsTotal || 0,
        unreadCount: profileData.messagesUnread || 0,
        recentMessages: (messagesData.messages || []).map(msg => ({
          id: msg.id,
          threadId: msg.threadId
        }))
      };

      // Optionally fetch full message details for first 5 unread
      if (metadata.recentMessages.length > 0) {
        try {
          const fullMessages = await Promise.all(
            metadata.recentMessages.slice(0, 5).map(msg =>
              makeGoogleRequest(
                accessToken,
                `https://www.gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
                { params: { format: 'metadata' } }
              )
            )
          );

          metadata.unreadMessages = fullMessages.map(msg => {
            const headers = msg.payload?.headers || [];
            return {
              id: msg.id,
              from: headers.find(h => h.name === 'From')?.value || 'Unknown',
              subject: headers.find(h => h.name === 'Subject')?.value || '(No subject)',
              date: headers.find(h => h.name === 'Date')?.value || '',
              snippet: msg.snippet || ''
            };
          });
        } catch (err) {
          logger.warn('Could not fetch full message details:', err.message);
        }
      }

      cacheService.set(cacheKey, metadata);
      return metadata;
    } catch (error) {
      logger.error('Failed to fetch Gmail metadata:', error.message);
      throw error;
    }
  },

  /**
   * Get user profile info
   */
  async getUserProfile(accessToken) {
    try {
      const data = await makeGoogleRequest(
        accessToken,
        'https://www.googleapis.com/oauth2/v2/userinfo'
      );
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture
      };
    } catch (error) {
      logger.error('Failed to fetch user profile:', error.message);
      throw error;
    }
  }
};
