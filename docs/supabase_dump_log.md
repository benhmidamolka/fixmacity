pg_dump: executing SELECT pg_catalog.set_config('search_path', '', false);
pg_dump: last built-in OID is 16383
pg_dump: reading extensions
pg_dump: identifying extension members
pg_dump: reading schemas
pg_dump: reading user-defined tables
pg_dump: reading user-defined functions
pg_dump: reading user-defined types
pg_dump: reading procedural languages
pg_dump: reading user-defined aggregate functions
pg_dump: reading user-defined operators
pg_dump: reading user-defined access methods
pg_dump: reading user-defined operator classes
pg_dump: reading user-defined operator families
pg_dump: reading user-defined text search parsers
pg_dump: reading user-defined text search templates
pg_dump: reading user-defined text search dictionaries
pg_dump: reading user-defined text search configurations
pg_dump: reading user-defined foreign-data wrappers
pg_dump: reading user-defined foreign servers
pg_dump: reading default privileges
pg_dump: reading user-defined collations
pg_dump: reading user-defined conversions
pg_dump: reading type casts
pg_dump: reading transforms
pg_dump: reading table inheritance information
pg_dump: reading event triggers
pg_dump: finding extension tables
pg_dump: finding inheritance relationships
pg_dump: reading column info for interesting tables
pg_dump: finding table default expressions
pg_dump: finding table check constraints
pg_dump: flagging inherited columns in subtables
pg_dump: reading partitioning data
pg_dump: reading indexes
pg_dump: flagging indexes in partitioned tables
pg_dump: reading extended statistics
pg_dump: reading constraints
pg_dump: reading triggers
pg_dump: reading rewrite rules
pg_dump: reading policies
pg_dump: reading row-level security policies
pg_dump: reading publications
pg_dump: reading publication membership of tables
pg_dump: reading publication membership of schemas
pg_dump: reading subscriptions
pg_dump: reading subscription membership of tables
pg_dump: reading large objects
pg_dump: reading dependency data
pg_dump: saving encoding = UTF8
pg_dump: saving "standard_conforming_strings = on"
pg_dump: saving "search_path = "
pg_dump: creating SCHEMA "public"
pg_dump: creating COMMENT "SCHEMA public"
pg_dump: creating EXTENSION "postgis"
pg_dump: creating COMMENT "EXTENSION postgis"
pg_dump: creating EXTENSION "uuid-ossp"
pg_dump: creating COMMENT "EXTENSION "uuid-ossp""
pg_dump: creating TYPE "public.declaration_status"
pg_dump: creating TYPE "public.proposition_status"
pg_dump: creating TYPE "public.user_role"
pg_dump: creating FUNCTION "public.close_expired_propositions()"
pg_dump: creating FUNCTION "public.get_nearby_declarations(double precision, double precision, double precision, text)"
pg_dump: creating FUNCTION "public.get_proposition_summary(uuid)"
pg_dump: creating FUNCTION "public.guard_declaration_edit()"
pg_dump: creating FUNCTION "public.increment_ref_sequence(text)"
pg_dump: creating FUNCTION "public.increment_vote_count(uuid)"
pg_dump: creating FUNCTION "public.sync_proposition_vote_counts()"
pg_dump: creating FUNCTION "public.update_declaration_location()"
pg_dump: creating TABLE "public.chatbot_sessions"
pg_dump: creating TABLE "public.declaration_photos"
pg_dump: creating TABLE "public.declarations"
pg_dump: creating TABLE "public.delegations"
pg_dump: creating TABLE "public.internal_comments"
pg_dump: creating TABLE "public.notifications"
pg_dump: creating TABLE "public.password_reset_tokens"
pg_dump: creating TABLE "public.proposition_votes"
pg_dump: creating TABLE "public.propositions"
pg_dump: creating TABLE "public.ratings"
pg_dump: creating TABLE "public.ref_sequences"
pg_dump: creating TABLE "public.services"
pg_dump: creating TABLE "public.status_history"
pg_dump: creating TABLE "public.token_blacklist"
pg_dump: creating TABLE "public.users"
pg_dump: creating VIEW "public.v_declarations_citizen"
pg_dump: creating VIEW "public.v_map_declarations"
pg_dump: creating VIEW "public.v_propositions_active"
pg_dump: creating TABLE "public.votes"
pg_dump: processing data for table "public.chatbot_sessions"
pg_dump: dumping contents of table "public.chatbot_sessions"
pg_dump: processing data for table "public.declaration_photos"
pg_dump: dumping contents of table "public.declaration_photos"
pg_dump: processing data for table "public.declarations"
pg_dump: dumping contents of table "public.declarations"
pg_dump: processing data for table "public.delegations"
pg_dump: dumping contents of table "public.delegations"
pg_dump: processing data for table "public.internal_comments"
pg_dump: dumping contents of table "public.internal_comments"
pg_dump: processing data for table "public.notifications"
pg_dump: dumping contents of table "public.notifications"
pg_dump: processing data for table "public.password_reset_tokens"
pg_dump: dumping contents of table "public.password_reset_tokens"
pg_dump: processing data for table "public.proposition_votes"
pg_dump: dumping contents of table "public.proposition_votes"
pg_dump: processing data for table "public.propositions"
pg_dump: dumping contents of table "public.propositions"
pg_dump: processing data for table "public.ratings"
pg_dump: dumping contents of table "public.ratings"
pg_dump: processing data for table "public.ref_sequences"
pg_dump: dumping contents of table "public.ref_sequences"
pg_dump: processing data for table "public.services"
pg_dump: dumping contents of table "public.services"
pg_dump: processing data for table "public.spatial_ref_sys"
pg_dump: dumping contents of table "public.spatial_ref_sys"
pg_dump: processing data for table "public.status_history"
pg_dump: dumping contents of table "public.status_history"
pg_dump: processing data for table "public.token_blacklist"
pg_dump: dumping contents of table "public.token_blacklist"
pg_dump: processing data for table "public.users"
pg_dump: dumping contents of table "public.users"
pg_dump: processing data for table "public.votes"
pg_dump: dumping contents of table "public.votes"
pg_dump: creating CONSTRAINT "public.chatbot_sessions chatbot_sessions_pkey"
pg_dump: creating CONSTRAINT "public.declaration_photos declaration_photos_pkey"
pg_dump: creating CONSTRAINT "public.declarations declarations_pkey"
pg_dump: creating CONSTRAINT "public.declarations declarations_ref_citoyen_key"
pg_dump: creating CONSTRAINT "public.delegations delegations_code_key"
pg_dump: creating CONSTRAINT "public.delegations delegations_pkey"
pg_dump: creating CONSTRAINT "public.internal_comments internal_comments_pkey"
pg_dump: creating CONSTRAINT "public.notifications notifications_pkey"
pg_dump: creating CONSTRAINT "public.password_reset_tokens password_reset_tokens_pkey"
pg_dump: creating CONSTRAINT "public.password_reset_tokens password_reset_tokens_token_key"
pg_dump: creating CONSTRAINT "public.proposition_votes proposition_votes_pkey"
pg_dump: creating CONSTRAINT "public.proposition_votes proposition_votes_unique"
pg_dump: creating CONSTRAINT "public.propositions propositions_pkey"
pg_dump: creating CONSTRAINT "public.ratings ratings_one_per_decl"
pg_dump: creating CONSTRAINT "public.ratings ratings_pkey"
pg_dump: creating CONSTRAINT "public.ref_sequences ref_sequences_pkey"
pg_dump: creating CONSTRAINT "public.services services_code_key"
pg_dump: creating CONSTRAINT "public.services services_pkey"
pg_dump: creating CONSTRAINT "public.status_history status_history_pkey"
pg_dump: creating CONSTRAINT "public.token_blacklist token_blacklist_pkey"
pg_dump: creating CONSTRAINT "public.users users_email_key"
pg_dump: creating CONSTRAINT "public.users users_pkey"
pg_dump: creating CONSTRAINT "public.votes votes_one_per_user"
pg_dump: creating CONSTRAINT "public.votes votes_pkey"
pg_dump: creating TRIGGER "public.declarations trg_guard_declaration_edit"
pg_dump: creating TRIGGER "public.proposition_votes trg_sync_proposition_votes"
pg_dump: creating TRIGGER "public.declarations trg_update_location"
pg_dump: creating FK CONSTRAINT "public.chatbot_sessions chatbot_sessions_user_id_fkey"
pg_dump: creating FK CONSTRAINT "public.declaration_photos declaration_photos_declaration_id_fkey"
pg_dump: creating FK CONSTRAINT "public.declaration_photos declaration_photos_uploaded_by_fkey"
pg_dump: creating FK CONSTRAINT "public.declarations declarations_agent_id_fkey"
pg_dump: creating FK CONSTRAINT "public.declarations declarations_citizen_id_fkey"
pg_dump: creating FK CONSTRAINT "public.declarations declarations_delegation_id_fkey"
pg_dump: creating FK CONSTRAINT "public.declarations declarations_department_id_fkey"
pg_dump: creating FK CONSTRAINT "public.declarations declarations_service_id_fkey"
pg_dump: creating FK CONSTRAINT "public.declarations declarations_user_id_fkey"
pg_dump: creating FK CONSTRAINT "public.internal_comments internal_comments_declaration_id_fkey"
pg_dump: creating FK CONSTRAINT "public.internal_comments internal_comments_user_id_fkey"
pg_dump: creating FK CONSTRAINT "public.notifications notifications_user_id_fkey"
pg_dump: creating FK CONSTRAINT "public.password_reset_tokens password_reset_tokens_user_id_fkey"
pg_dump: creating FK CONSTRAINT "public.proposition_votes proposition_votes_citizen_id_fkey"
pg_dump: creating FK CONSTRAINT "public.proposition_votes proposition_votes_proposition_id_fkey"
pg_dump: creating FK CONSTRAINT "public.propositions propositions_created_by_fkey"
pg_dump: creating FK CONSTRAINT "public.ratings ratings_citizen_id_fkey"
pg_dump: creating FK CONSTRAINT "public.ratings ratings_declaration_id_fkey"
pg_dump: creating FK CONSTRAINT "public.status_history status_history_changed_by_fkey"
pg_dump: creating FK CONSTRAINT "public.status_history status_history_declaration_id_fkey"
pg_dump: creating FK CONSTRAINT "public.token_blacklist token_blacklist_user_id_fkey"
pg_dump: creating FK CONSTRAINT "public.users users_delegation_id_fkey"
pg_dump: creating FK CONSTRAINT "public.users users_department_id_fkey"
pg_dump: creating FK CONSTRAINT "public.votes votes_declaration_id_fkey"
pg_dump: creating FK CONSTRAINT "public.votes votes_user_id_fkey"
pg_dump: creating ACL "SCHEMA public"
Successfully completed.