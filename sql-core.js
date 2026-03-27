/**
 * Zeeshan AI SQL Mentor - Core Logic
 * Loaded dynamically via CDN
 */
jQuery(document).ready(function($) {
    const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

    // ==========================================
    // 1. BYOK & BYOM (Model) Logic
    // ==========================================
    function getOpenRouterConfig() {
        let key = localStorage.getItem('koha_sql_api_key');
        let model = localStorage.getItem('koha_sql_ai_model');

        if (!key || !model) {
            key = prompt("Welcome to the Zeeshan AI SQL Mentor!\n\nPlease enter your OpenRouter API Key:");
            if (!key) return null;

            model = prompt("Please enter the OpenRouter Model ID you wish to use:\n(e.g., meta-llama/llama-3-8b-instruct:free)", "meta-llama/llama-3-8b-instruct:free");
            if (!model) return null;

            localStorage.setItem('koha_sql_api_key', key.trim());
            localStorage.setItem('koha_sql_ai_model', model.trim());
            alert("API Key and Model saved securely in your browser!");
        }
        return { key, model };
    }

    // ==========================================
    // 2. Chatbot UI Construction
    // ==========================================
    const assistantHtml = `
        <div id="ai-sql-chatbot-wrapper" style="position:fixed; bottom:30px; left:30px; z-index:10000; font-family: 'Segoe UI', Roboto, sans-serif;">
            <div id="ai-sql-window" style="display:none; width:390px; height:560px; background:#fff; border:1px solid #e0e0e0; border-radius:20px; box-shadow:0 15px 50px rgba(0,0,0,0.2); flex-direction:column; overflow:hidden; border-bottom: 5px solid #408540;">
                
                <div style="background:#408540; color:#fff; padding:18px; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class="fa fa-database" style="font-size:18px;"></i>
                        <span style="font-size:16px; letter-spacing:0.5px;">Zeeshan AI SQL Mentor</span>
                    </div>
                    <div>
                        <span id="reset-sql-config" style="cursor:pointer; font-size:11px; margin-right:12px; text-decoration:underline; font-weight:normal;" title="Change API Key or Model">Settings</span>
                        <span id="close-sql-chat" style="cursor:pointer; font-size:26px; line-height:20px;">&times;</span>
                    </div>
                </div>
                
                <div id="sql-chat-body" style="flex:1; padding:20px; overflow-y:auto; font-size:14px; line-height:1.6; color:#444; background:#fcfdfc;">
                    <div style="background: #fff; padding: 12px; border-radius: 12px; border-left: 4px solid #408540; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 15px;">
                        <strong>Mentor:</strong> Assalam-o-Alaikum, Mr. Zeeshan! Describe the report you need, and I will write the SQL for you.
                    </div>
                    <div id="chat-history"></div>
                </div>

                <div id="sql-output-zone" style="display:none; padding:15px; background:#f4f4f4; border-top:1px solid #eee;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <span style="font-weight:bold; font-size:11px; color:#408540; text-transform: uppercase;">Generated SQL</span>
                        <div style="display:flex; gap:8px;">
                            <button id="btn-insert-sql" style="background:#408540; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-size:12px; cursor:pointer; font-weight: bold; display:flex; align-items:center; gap:5px;">
                                <i class="fa fa-magic"></i> Put in Editor
                            </button>
                            <button id="btn-copy-chat-sql" style="background:#333; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:5px;">
                                <i class="fa fa-copy"></i> Copy
                            </button>
                        </div>
                    </div>
                    <pre id="sql-chat-display" style="background:#1e1e1e; color:#dcdcaa; padding:15px; border-radius:8px; font-size:13px; margin:0; max-height:180px; overflow-y:auto; white-space:pre-wrap; font-family:'Consolas', monospace; border: 1px solid #000; line-height: 1.4;"></pre>
                </div>

                <div style="padding:20px; border-top:1px solid #eee; background:#fff;">
                    <textarea id="sql-chat-input" style="width:100%; height:80px; border:1px solid #eee; border-radius:12px; padding:12px; font-size:14px; resize:none; outline: none; box-sizing: border-box;" placeholder="e.g., Average age of collection by item type..."></textarea>
                    <button id="btn-send-sql-request" style="width:100%; background:#408540; color:#fff; border:none; padding:14px; border-radius:10px; margin-top:12px; font-weight:bold; cursor:pointer; font-size: 15px; box-shadow: 0 4px 10px rgba(64, 133, 64, 0.2);">
                        Generate SQL Report
                    </button>
                </div>
            </div>

            <div id="sql-chat-trigger" style="width:70px; height:70px; background:#408540; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; cursor:pointer; box-shadow:0 8px 25px rgba(0,0,0,0.2); border:4px solid #fff;">
                <i class="fa fa-database" style="font-size:28px;"></i>
            </div>
        </div>
    `;

    $('body').append(assistantHtml);

    // ==========================================
    // 3. UI Toggle Logic & Settings Reset
    // ==========================================
    $('#sql-chat-trigger').click(() => $('#ai-sql-window').fadeToggle(300).css('display', 'flex'));
    $('#close-sql-chat').click(() => $('#ai-sql-window').fadeOut(200));

    $('#reset-sql-config').click(function() {
        if(confirm("Are you sure you want to reset your API Key and Model preferences?")) {
            localStorage.removeItem('koha_sql_api_key');
            localStorage.removeItem('koha_sql_ai_model');
            alert("Settings cleared. Click 'Generate SQL Report' to enter new details.");
        }
    });

    // ==========================================
    // 4. Generation Logic (Trained Knowledge Base)
    // ==========================================
    async function fetchSQL(promptText, retryCount = 0) {
        const config = getOpenRouterConfig();
        if (!config) throw new Error("Configuration Cancelled");

        const systemInstruction = `You are Zeeshan AI SQL Mentor. Expert on Koha MySQL Schema.
        Knowledge Base:
        - Catalog: biblio (title), biblioitems, items (barcode, itype, homebranch).
        - Age: Copyright DIV 5 for range, ExtractValue(metadata,'//controlfield[@tag="008"]') for age.
        - Dewey: REGEXP on itemcallnumber for Dewey 10s.
        - New Titles: dateaccessioned within interval 30 days.
        - Patrons: borrowers, categories.
        Rules:
        1. Return ONLY raw MySQL SELECT.
        2. NO markdown, NO backticks.
        3. Use table aliases (b, i, p).
        4. Support parameters <<Label|type>>.`;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 
                    'Authorization': 'Bearer ' + config.key,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin, 
                    'X-Title': 'Zeeshan AI SQL Mentor'
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [
                        { role: "system", content: systemInstruction },
                        { role: "user", content: promptText }
                    ],
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                if (response.status === 401) throw new Error("Invalid API Key");
                throw new Error("API Connection Failed");
            }
            
            const result = await response.json();
            let sqlText = result.choices?.[0]?.message?.content || "";
            return sqlText.replace(/```sql|```/gi, "").trim();

        } catch (err) {
            if (retryCount < 1 && err.message !== "Configuration Cancelled") {
                return fetchSQL(promptText, retryCount + 1);
            }
            throw err;
        }
    }

    // ==========================================
    // 5. Action Logic
    // ==========================================
    $('#btn-send-sql-request').click(async function() {
        const prompt = $('#sql-chat-input').val();
        if (!prompt || prompt.trim().length < 5) return;

        const btn = $(this);
        $('#chat-history').append(`<div style="margin-top:15px; padding-left: 20%; text-align: right;"><span style="display:inline-block; background:#e1f5fe; padding:8px 12px; border-radius:12px; font-size:13px; color:#01579b; border: 1px solid #b3e5fc;">${prompt}</span></div>`);
        $('#sql-chat-input').val('');
        btn.html('<i class="fa fa-spinner fa-spin"></i> Writing Code...').prop('disabled', true);
        $('#sql-output-zone').hide();

        try {
            const sql = await fetchSQL(prompt);
            $('#sql-chat-display').text(sql);
            $('#sql-output-zone').slideDown(400);
            $('#sql-chat-body').animate({ scrollTop: $('#sql-chat-body')[0].scrollHeight }, 500);
        } catch (e) {
            if (e.message !== "Configuration Cancelled") {
                $('#chat-history').append(`<p style="color:#d32f2f; font-size: 12px; margin-top:10px; padding: 10px; background: #ffebee; border-radius: 8px;"><strong>Error:</strong> ${e.message}. Check your OpenRouter account or change the model via Settings.</p>`);
                $('#sql-chat-body').animate({ scrollTop: $('#sql-chat-body')[0].scrollHeight }, 500);
            }
        } finally {
            btn.html('Generate SQL Report').prop('disabled', false);
        }
    });

    // ==========================================
    // 6. FORCE INSERTION & Copy Logic 
    // ==========================================
    $(document).on('click', '#btn-insert-sql', function() {
        const sqlText = $('#sql-chat-display').text();
        let success = false;
        const editorDiv = document.getElementById('sql');
        
        if (editorDiv) {
            if (window.ace) {
                try {
                    const editor = ace.edit(editorDiv);
                    editor.setValue(sqlText, 1); 
                    editor.clearSelection();
                    success = true;
                } catch(e) {}
            }
            if (!success) {
                try {
                    const instance = $(editorDiv).data('ace-editor') || editorDiv.env?.editor;
                    if (instance) {
                        instance.setValue(sqlText, 1);
                        instance.clearSelection();
                        success = true;
                    }
                } catch(e) {}
            }
        }
        
        if (!success) {
            const $ta = $('textarea#sql, #sql_editor, .ace_text-input').first();
            if ($ta.length) {
                $ta.val(sqlText).trigger('input').trigger('change');
                success = true;
            }
        }

        if (success) {
            const originalBtn = $(this).html();
            $(this).html('<i class="fa fa-check"></i> Inserted!').css('background', '#2c662c');
            $('#sql').css('outline', '3px solid #408540');
            setTimeout(() => {
                $(this).html(originalBtn).css('background', '#408540');
                $('#sql').css('outline', 'none');
                $('#ai-sql-window').fadeOut(500);
            }, 1500);
        } else {
            alert("Please go to the 'Create from SQL' page first so I can find the editor!");
        }
    });

    $(document).on('click', '#btn-copy-chat-sql', function() {
        const sqlText = $('#sql-chat-display').text();
        const el = document.createElement('textarea');
        el.value = sqlText;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        
        const originalHtml = $(this).html();
        $(this).html('<i class="fa fa-check"></i> Copied!');
        setTimeout(() => $(this).html(originalHtml), 2000);
    });
});
