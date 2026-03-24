export enum LogLevel {
  LOG = 'log',
  ERROR = 'error',
  WARN = 'warn',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
  FATAL = 'fatal',
}

export enum LogAction {
  REGISTER = 'register',
  LOGIN = 'login',
  GET_PROFILE = 'get_profile',
  GET_ALL_USERS = 'get_all_users',
  CREATE_EVENT = 'create_event',
  GET_EVENTS = 'get_events',
  GET_EVENT = 'get_event',
  UPDATE_EVENT = 'update_event',
  DELETE_EVENT = 'delete_event',
}
