-- Enable Supabase Realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE lead_events;
ALTER PUBLICATION supabase_realtime ADD TABLE webinar_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE ad_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE email_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
