-- Fix RLS initplan warnings by wrapping auth.* calls with SELECT
-- and consolidate duplicate permissive policies.

-- Audit logs
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;

CREATE POLICY "Users can view own audit logs" ON public.audit_logs
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- Chat typing events
DROP POLICY IF EXISTS "Users can insert own typing events" ON public.chat_typing_events;
DROP POLICY IF EXISTS "Users can view typing in their chats" ON public.chat_typing_events;

CREATE POLICY "Users can insert own typing events" ON public.chat_typing_events
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view typing in their chats" ON public.chat_typing_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM chats
      WHERE chats.id = chat_typing_events.chat_id
        AND (
          chats.buyer_id = (select auth.uid())
          OR chats.seller_id = (select auth.uid())
        )
    )
  );

-- Chats
DROP POLICY IF EXISTS "Users can insert chats" ON public.chats;
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;

CREATE POLICY "Users can create chats" ON public.chats
  FOR INSERT
  WITH CHECK ((select auth.uid()) = buyer_id);

DROP POLICY IF EXISTS "Users can update their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;

CREATE POLICY "Users can update their own chats" ON public.chats
  FOR UPDATE
  USING (
    (select auth.uid()) = buyer_id
    OR (select auth.uid()) = seller_id
  );

CREATE POLICY "Users can view their own chats" ON public.chats
  FOR SELECT
  USING (
    (select auth.uid()) = buyer_id
    OR (select auth.uid()) = seller_id
  );

-- Favorites
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;

CREATE POLICY "Users can delete own favorites" ON public.favorites
  FOR DELETE
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own favorites" ON public.favorites
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own favorites" ON public.favorites
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- Invoices
DROP POLICY IF EXISTS "Service role full access invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;

CREATE POLICY "Service role full access invoices" ON public.invoices
  FOR ALL
  TO service_role
  USING ((select auth.role()) = 'service_role'::text)
  WITH CHECK ((select auth.role()) = 'service_role'::text);

CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- Listing boosts
DROP POLICY IF EXISTS "Service role full access boosts" ON public.listing_boosts;
DROP POLICY IF EXISTS "Users can view own boosts" ON public.listing_boosts;

CREATE POLICY "Service role full access boosts" ON public.listing_boosts
  FOR ALL
  TO service_role
  USING ((select auth.role()) = 'service_role'::text)
  WITH CHECK ((select auth.role()) = 'service_role'::text);

CREATE POLICY "Users can view own boosts" ON public.listing_boosts
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- Listing images
DROP POLICY IF EXISTS "Users can insert images for own listings" ON public.listing_images;

CREATE POLICY "Users can insert images for own listings" ON public.listing_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM listings
      WHERE listings.id = listing_images.listing_id
        AND listings.user_id = (select auth.uid())
    )
  );

-- Listings
DROP POLICY IF EXISTS "Listings are viewable by everyone" ON public.listings;
DROP POLICY IF EXISTS "Users can delete own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can insert own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can update own listings" ON public.listings;

CREATE POLICY "Listings are viewable by everyone" ON public.listings
  FOR SELECT
  USING (
    (status <> 'deleted'::text)
    OR (user_id = (select auth.uid()))
  );

CREATE POLICY "Users can delete own listings" ON public.listings
  FOR DELETE
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own listings" ON public.listings
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own listings" ON public.listings
  FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- Messages
DROP POLICY IF EXISTS "Users can send messages in their chats" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in their chats" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;

CREATE POLICY "Users can insert messages in their chats" ON public.messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM chats
      WHERE chats.id = messages.chat_id
        AND (
          chats.buyer_id = (select auth.uid())
          OR chats.seller_id = (select auth.uid())
        )
    )
  );

CREATE POLICY "Users can view messages in their chats" ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM chats
      WHERE chats.id = messages.chat_id
        AND (
          chats.buyer_id = (select auth.uid())
          OR chats.seller_id = (select auth.uid())
        )
    )
  );

-- Payment audit log
DROP POLICY IF EXISTS "Service role full access audit" ON public.payment_audit_log;

CREATE POLICY "Service role full access audit" ON public.payment_audit_log
  FOR ALL
  TO service_role
  USING ((select auth.role()) = 'service_role'::text)
  WITH CHECK ((select auth.role()) = 'service_role'::text);

-- Rate limits
DROP POLICY IF EXISTS "Users can view own rate limits" ON public.rate_limits;

CREATE POLICY "Users can view own rate limits" ON public.rate_limits
  FOR SELECT
  USING (key ~~ ((select auth.uid())::text || '%'::text));

-- Recommendations cache
DROP POLICY IF EXISTS "Users can view own recommendations" ON public.recommendations_cache;

CREATE POLICY "Users can view own recommendations" ON public.recommendations_cache
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- Reports
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can view reports" ON public.reports;
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;

CREATE POLICY "Admins can update reports" ON public.reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['admin'::app_role, 'moderator'::app_role])
    )
  );

CREATE POLICY "Admins can view reports" ON public.reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['admin'::app_role, 'moderator'::app_role])
    )
  );

CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT
  WITH CHECK ((select auth.uid()) = reporter_id);

-- User interactions
DROP POLICY IF EXISTS "Users can insert own interactions" ON public.user_interactions;
DROP POLICY IF EXISTS "Users can view own interactions" ON public.user_interactions;

CREATE POLICY "Users can insert own interactions" ON public.user_interactions
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own interactions" ON public.user_interactions
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- User roles
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;

CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1
      FROM user_roles user_roles_1
      WHERE user_roles_1.user_id = (select auth.uid())
        AND user_roles_1.role = 'admin'::app_role
    )
  );
