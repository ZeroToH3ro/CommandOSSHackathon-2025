module scammer::scammer {
    use sui::event;
    use sui::tx_context::{Self, TxContext};
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use std::vector;
    use sui::table::{Self, Table};
    use sui::address;
    use std::bcs;

    // ===== Error Codes =====
    const EInvalidRiskScore: u64 = 0;
    const EUnauthorized: u64 = 1;
    const EAddressNotFound: u64 = 2;

    // ===== public Structs =====

    /// Main detector state object
    public struct DetectorState has key {
        id: UID,
        admin: address,
        known_scammer_addresses: vector<address>,
        whitelisted_addresses: vector<address>,
        transaction_history: Table<address, TransactionRecord>,
        risk_thresholds: RiskThresholds,
        ai_config: AIConfig,
        monitoring_enabled: bool,
    }

    /// Individual transaction record for pattern analysis
    public struct TransactionRecord has store {
        address: address,
        transaction_count: u64,
        total_volume: u64,
        last_transaction_time: u64,
        rapid_transaction_count: u64,
        failed_transaction_count: u64,
        contract_interaction_count: u64,
        risk_score: u8,
        suspicious_patterns: vector<u8>, // Pattern type IDs
    }

    /// Risk assessment thresholds matching the UI
    public struct RiskThresholds has store, copy, drop {
        rapid_transaction_threshold: u64, // 5 minutes in milliseconds
        large_transfer_threshold: u64,    // Amount in SUI (scaled)
        failed_transaction_threshold: u64, // Number of failed transactions
        contract_interaction_threshold: u8, // Percentage
        round_amount_threshold: u64,      // Number of round amount transactions
        unusual_time_threshold: u64,      // Hours for unusual activity
    }

    // ===== AI Configuration Struct =====
    
    /// AI configuration for risk assessment
    public struct AIConfig has store, copy, drop {
        enabled: bool,
        risk_weight: u8,              // Weight given to AI risk score (0-100)
        confidence_threshold: u8,      // Minimum confidence required (0-100)
        max_response_time_ms: u64,    // Max time to wait for AI response
        fallback_to_rule_based: bool, // Whether to fallback if AI fails
        supported_models: vector<u8>, // Bitmask: 1=GPT, 2=Gemini, 4=Ollama
    }

    // ===== Events =====

    /// Alert for suspicious transactions (matches UI AlertBanner)
    public struct ScamAlert has copy, drop {
        tx_digest: vector<u8>,
        sender: address,
        recipient: address,
        amount: u64,
        risk_score: u8,
        severity: u8, // 1=low, 2=medium, 3=high, 4=critical
        alert_type: u8, // Matches UI alert types
        message: vector<u8>,
        timestamp: u64,
    }

    /// Pattern detection event (matches UI PatternDetector)
    public struct SuspiciousPatternDetected has copy, drop {
        wallet_address: address,
        pattern_type: u8, // 1=rapid_tx, 2=large_transfer, 3=unusual_contract, etc.
        risk_level: u8,   // 1=low, 2=medium, 3=high, 4=critical
        description: vector<u8>,
        transaction_ids: vector<vector<u8>>,
        risk_score: u8,
        detected_at: u64,
    }

    /// Transaction monitoring event (matches UI TransactionMonitor)
    public struct TransactionAnalyzed has copy, drop {
        sender: address,
        recipient: address,
        amount: u64,
        transaction_type: u8, // 1=send, 2=receive, 3=contract, 4=approval
        risk_factors: vector<u8>,
        final_risk_score: u8,
        timestamp: u64,
    }

    /// Wallet monitoring status (matches UI WalletWatcher)
    public struct WalletMonitoringUpdate has copy, drop {
        wallet_address: address,
        is_watching: bool,
        current_risk_score: u8,
        patterns_detected: u64,
        last_update: u64,
    }

    // ===== Pattern Type Constants =====
    const PATTERN_RAPID_TRANSACTIONS: u8 = 1;
    const PATTERN_LARGE_TRANSFER: u8 = 2;
    const PATTERN_UNUSUAL_CONTRACT: u8 = 3;
    const PATTERN_FAILED_SPIKE: u8 = 4;
    const PATTERN_ROUND_AMOUNTS: u8 = 5;
    const PATTERN_NEW_ADDRESS: u8 = 6;
    const PATTERN_BLACKLISTED_ADDRESS: u8 = 7;

    // ===== Alert Type Constants (matching UI) =====
    const ALERT_SECURITY: u8 = 1;
    const ALERT_WARNING: u8 = 2;
    const ALERT_INFO: u8 = 3;
    const ALERT_ERROR: u8 = 4;

    // ===== Transaction Type Constants =====
    const TX_TYPE_SEND: u8 = 1;
    const TX_TYPE_RECEIVE: u8 = 2;
    const TX_TYPE_CONTRACT: u8 = 3;
    const TX_TYPE_APPROVAL: u8 = 4;

    // ===== Initialization =====

    /// Initialize the detector with known scammer addresses
    fun init(ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);
        
        let detector_state = DetectorState {
            id: object::new(ctx),
            admin,
            known_scammer_addresses: vector::empty(),
            whitelisted_addresses: vector::empty(),
            transaction_history: table::new(ctx),
            risk_thresholds: RiskThresholds {
                rapid_transaction_threshold: 300000, // 5 minutes in ms
                large_transfer_threshold: 1000000000000, // 1000 SUI in MIST
                failed_transaction_threshold: 3,
                contract_interaction_threshold: 70,
                round_amount_threshold: 5,
                unusual_time_threshold: 6, // 2-6 AM considered unusual
            },
            ai_config: AIConfig {
                enabled: true,
                risk_weight: 70,
                confidence_threshold: 80,
                max_response_time_ms: 2000,
                fallback_to_rule_based: true,
                supported_models: vector::empty(),
            },
            monitoring_enabled: true,
        };

        transfer::share_object(detector_state);
    }

    // ===== Main Transaction Analysis Function =====

    /// Main function to analyze transactions (called by frontend monitoring)
    public fun analyze_transaction(
        detector_state: &mut DetectorState,
        sender: address,
        recipient: address,
        amount: u64,
        tx_type: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        if (!detector_state.monitoring_enabled) return;

        let current_time = clock::timestamp_ms(clock);
        let tx_digest = *tx_context::digest(ctx);
        
        update_transaction_record(detector_state, sender, amount, current_time, tx_type);
        update_transaction_record(detector_state, recipient, amount, current_time, TX_TYPE_RECEIVE);

        let sender_risk = assess_comprehensive_risk(detector_state, sender, amount, current_time);
        let recipient_risk = assess_comprehensive_risk(detector_state, recipient, amount, current_time);
        
        let final_risk = if (sender_risk > recipient_risk) sender_risk else recipient_risk;

        event::emit(TransactionAnalyzed {
            sender,
            recipient,
            amount,
            transaction_type: tx_type,
            risk_factors: get_risk_factors(detector_state, sender, recipient, amount),
            final_risk_score: final_risk,
            timestamp: current_time,
        });

        check_and_emit_patterns(detector_state, sender, current_time);
        check_and_emit_patterns(detector_state, recipient, current_time);

        if (final_risk > 80) {
            emit_scam_alert(tx_digest, sender, recipient, amount, final_risk, current_time);
        }
    }

    /// Comprehensive risk assessment (matches UI risk calculation)
    fun assess_comprehensive_risk(
        detector_state: &DetectorState,
        wallet_address: address,
        amount: u64,
        current_time: u64
    ): u8 {
        let mut risk_score: u64 = 0;

        if (vector::contains(&detector_state.known_scammer_addresses, &wallet_address)) {
            risk_score = risk_score + 90;
        };

        if (vector::contains(&detector_state.whitelisted_addresses, &wallet_address)) {
            risk_score = risk_score / 2;
        };

        if (amount > detector_state.risk_thresholds.large_transfer_threshold) {
            risk_score = risk_score + 25;
        };

        if (table::contains(&detector_state.transaction_history, wallet_address)) {
            let record = table::borrow(&detector_state.transaction_history, wallet_address);
            
            if (record.rapid_transaction_count > 3) {
                risk_score = risk_score + 20;
            };

            if (record.failed_transaction_count > detector_state.risk_thresholds.failed_transaction_threshold) {
                risk_score = risk_score + 15;
            };

            let contract_percentage = (record.contract_interaction_count * 100) / record.transaction_count;
            if ((contract_percentage as u8) > detector_state.risk_thresholds.contract_interaction_threshold) {
                risk_score = risk_score + 10;
            };
        };

        // Cap at 100
        if (risk_score > 100) {
            100
        } else {
            (risk_score as u8)
        }
    }

    /// Pattern detection and alert emission
    fun check_and_emit_patterns(
        detector_state: &DetectorState,
        wallet_address: address,
        current_time: u64
    ) {
        if (!table::contains(&detector_state.transaction_history, wallet_address)) return;

        let record = table::borrow(&detector_state.transaction_history, wallet_address);

        if (record.rapid_transaction_count > 3) {
            event::emit(SuspiciousPatternDetected {
                wallet_address,
                pattern_type: PATTERN_RAPID_TRANSACTIONS,
                risk_level: if (record.rapid_transaction_count > 10) 4 else 3,
                description: b"Multiple rapid transactions detected",
                transaction_ids: vector::empty(), // Would contain actual tx IDs
                risk_score: (record.rapid_transaction_count * 10 as u8),
                detected_at: current_time,
            });
        };

        if (record.failed_transaction_count > detector_state.risk_thresholds.failed_transaction_threshold) {
            event::emit(SuspiciousPatternDetected {
                wallet_address,
                pattern_type: PATTERN_FAILED_SPIKE,
                risk_level: 2,
                description: b"High failure rate detected",
                transaction_ids: vector::empty(),
                risk_score: (record.failed_transaction_count * 15 as u8),
                detected_at: current_time,
            });
        };
    }

    /// Update transaction record for pattern analysis
    fun update_transaction_record(
        detector_state: &mut DetectorState,
        wallet_address: address,
        amount: u64,
        current_time: u64,
        tx_type: u8
    ) {
        if (!table::contains(&detector_state.transaction_history, wallet_address)) {
            let new_record = TransactionRecord {
                address: wallet_address,
                transaction_count: 1,
                total_volume: amount,
                last_transaction_time: current_time,
                rapid_transaction_count: 0,
                failed_transaction_count: 0,
                contract_interaction_count: if (tx_type == TX_TYPE_CONTRACT) 1 else 0,
                risk_score: 0,
                suspicious_patterns: vector::empty(),
            };
            table::add(&mut detector_state.transaction_history, wallet_address, new_record);
        } else {
            let record = table::borrow_mut(&mut detector_state.transaction_history, wallet_address);
            record.transaction_count = record.transaction_count + 1;
            record.total_volume = record.total_volume + amount;

            if (current_time - record.last_transaction_time < detector_state.risk_thresholds.rapid_transaction_threshold) {
                record.rapid_transaction_count = record.rapid_transaction_count + 1;
            } else {
                record.rapid_transaction_count = 0;
            };

            if (tx_type == TX_TYPE_CONTRACT) {
                record.contract_interaction_count = record.contract_interaction_count + 1;
            };

            record.last_transaction_time = current_time;
        };
    }

    /// Get risk factors for transaction analysis
    fun get_risk_factors(
        detector_state: &DetectorState,
        sender: address,
        recipient: address,
        amount: u64
    ): vector<u8> {
        let mut factors = vector::empty<u8>();

        if (amount > detector_state.risk_thresholds.large_transfer_threshold) {
            vector::push_back(&mut factors, 1); // Large amount factor
        };

        if (vector::contains(&detector_state.known_scammer_addresses, &recipient)) {
            vector::push_back(&mut factors, 2); // Scammer recipient factor
        };

        if (vector::contains(&detector_state.known_scammer_addresses, &sender)) {
            vector::push_back(&mut factors, 3); // Scammer sender factor
        };

        factors
    }

    /// Emit scam alert
    fun emit_scam_alert(
        tx_digest: vector<u8>,
        sender: address,
        recipient: address,
        amount: u64,
        risk_score: u8,
        timestamp: u64
    ) {
        let severity = if (risk_score > 90) 4 else if (risk_score > 70) 3 else 2;
        
        event::emit(ScamAlert {
            tx_digest,
            sender,
            recipient,
            amount,
            risk_score,
            severity,
            alert_type: ALERT_SECURITY,
            message: b"High risk transaction detected",
            timestamp,
        });
    }

    // ===== Admin Functions =====

    /// Add known scammer addresses (admin only)
    public fun add_scammer_addresses(
        detector_state: &mut DetectorState,
        new_addresses: vector<address>,
        ctx: &TxContext
    ) {
        assert!(tx_context::sender(ctx) == detector_state.admin, EUnauthorized);
        
        vector::append(&mut detector_state.known_scammer_addresses, new_addresses);
    }

    /// Add whitelisted addresses (admin only)
    public fun add_whitelisted_addresses(
        detector_state: &mut DetectorState,
        new_addresses: vector<address>,
        ctx: &TxContext
    ) {
        assert!(tx_context::sender(ctx) == detector_state.admin, EUnauthorized);
        
        vector::append(&mut detector_state.whitelisted_addresses, new_addresses);
    }

    /// Update risk thresholds (admin only)
    public fun update_risk_thresholds(
        detector_state: &mut DetectorState,
        new_thresholds: RiskThresholds,
        ctx: &TxContext
    ) {
        assert!(tx_context::sender(ctx) == detector_state.admin, EUnauthorized);
        
        detector_state.risk_thresholds = new_thresholds;
    }

    /// Toggle monitoring (admin only)
    public fun toggle_monitoring(
        detector_state: &mut DetectorState,
        enabled: bool,
        ctx: &TxContext
    ) {
        assert!(tx_context::sender(ctx) == detector_state.admin, EUnauthorized);
        
        detector_state.monitoring_enabled = enabled;
    }

    /// Update AI configuration (admin only)
    public fun update_ai_config(
        detector_state: &mut DetectorState,
        new_ai_config: AIConfig,
        ctx: &TxContext
    ) {
        assert!(tx_context::sender(ctx) == detector_state.admin, EUnauthorized);
        
        detector_state.ai_config = new_ai_config;
    }

    // ===== Public View Functions =====

    /// Get admin address
    public fun get_admin(detector_state: &DetectorState): address {
        detector_state.admin
    }

    /// Get wallet risk score
    public fun get_wallet_risk_score(
        detector_state: &DetectorState,
        wallet_address: address
    ): u8 {
        if (table::contains(&detector_state.transaction_history, wallet_address)) {
            let record = table::borrow(&detector_state.transaction_history, wallet_address);
            record.risk_score
        } else {
            0
        }
    }

    /// Check if address is known scammer
    public fun is_known_scammer(
        detector_state: &DetectorState,
        wallet_address: address
    ): bool {
        vector::contains(&detector_state.known_scammer_addresses, &wallet_address)
    }

    /// Check if address is whitelisted
    public fun is_whitelisted(
        detector_state: &DetectorState,
        wallet_address: address
    ): bool {
        vector::contains(&detector_state.whitelisted_addresses, &wallet_address)
    }

    /// Get transaction count for address
    public fun get_transaction_count(
        detector_state: &DetectorState,
        wallet_address: address
    ): u64 {
        if (table::contains(&detector_state.transaction_history, wallet_address)) {
            let record = table::borrow(&detector_state.transaction_history, wallet_address);
            record.transaction_count
        } else {
            0
        }
    }

    /// Get AI configuration
    public fun get_ai_config(detector_state: &DetectorState): AIConfig {
        detector_state.ai_config
    }

    /// Get risk thresholds
    public fun get_risk_thresholds(detector_state: &DetectorState): RiskThresholds {
        detector_state.risk_thresholds
    }

    /// Start monitoring a wallet
    public fun start_wallet_monitoring(
        detector_state: &DetectorState,
        wallet_address: address,
        clock: &Clock
    ) {
        let current_time = clock::timestamp_ms(clock);
        let risk_score = get_wallet_risk_score(detector_state, wallet_address);
        
        event::emit(WalletMonitoringUpdate {
            wallet_address,
            is_watching: true,
            current_risk_score: risk_score,
            patterns_detected: 0, // Would track actual patterns
            last_update: current_time,
        });
    }

    /// Stop monitoring a wallet
    public fun stop_wallet_monitoring(
        wallet_address: address,
        clock: &Clock
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        event::emit(WalletMonitoringUpdate {
            wallet_address,
            is_watching: false,
            current_risk_score: 0,
            patterns_detected: 0,
            last_update: current_time,
        });
    }

    #[test_only]
    /// Test function to create detector state
    public fun create_detector_for_testing(ctx: &mut TxContext): DetectorState {
        DetectorState {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            known_scammer_addresses: vector::empty(),
            whitelisted_addresses: vector::empty(),
            transaction_history: table::new(ctx),
            risk_thresholds: RiskThresholds {
                rapid_transaction_threshold: 300000,
                large_transfer_threshold: 1000000000000,
                failed_transaction_threshold: 3,
                contract_interaction_threshold: 70,
                round_amount_threshold: 5,
                unusual_time_threshold: 6,
            },
            ai_config: AIConfig {
                enabled: true,
                risk_weight: 70,
                confidence_threshold: 80,
                max_response_time_ms: 2000,
                fallback_to_rule_based: true,
                supported_models: vector::empty(),
            },
            monitoring_enabled: true,
        }
    }
}
