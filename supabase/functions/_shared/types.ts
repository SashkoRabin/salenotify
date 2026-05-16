export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
    };
    from?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
      language_code?: string;
    };
    text?: string;
  };
  callback_query?: {
    id: string;
    data?: string;
    from: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
      language_code?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
        type: string;
      };
      text?: string;
      caption?: string;
    };
    inline_message_id?: string;
  };
};

export type Offer = {
  id?: string;

  chain: string;
  city?: string;

  title: string;
  category?: string;

  price_current: number;
  price_original?: number;
  discount_percent?: number;

  valid_from?: string;
  valid_to?: string;
};