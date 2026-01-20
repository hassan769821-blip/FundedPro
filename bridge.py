import MetaTrader5 as mt5
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

# MT5 کو شروع کرنا
if not mt5.initialize():
    print("MT5 Initialize Failed")

def login_user_mt5(account, password, server):
    # اگر وہی اکاؤنٹ پہلے سے لاگ ان ہے تو دوبارہ وقت ضائع نہ کریں
    acc_info = mt5.account_info()
    if acc_info is not None and str(acc_info.login) == str(account):
        return True
    
    # نئے اکاؤنٹ سے لاگ ان
    authorized = mt5.login(login=int(account), password=password, server=server)
    return authorized

@app.route('/get_account_data', methods=['POST'])
def get_account_data():
    data = request.json
    try:
        if login_user_mt5(data['mt5_id'], data['password'], data['server']):
            acc_info = mt5.account_info()
            positions = mt5.positions_get()
            
            pos_list = []
            if positions:
                for p in positions:
                    pos_list.append({
                        "ticket": p.ticket, 
                        "symbol": p.symbol,
                        "type": "BUY" if p.type == 0 else "SELL",
                        "volume": p.volume, 
                        "profit": p.profit,
                        "entryPrice": p.price_open
                    })
            
            return jsonify({
                "status": "Success",
                "balance": acc_info.balance,
                "equity": acc_info.equity,
                "profit": acc_info.profit,
                "positions": pos_list
            })
        return jsonify({"status": "Failed", "message": "Invalid MT5 Credentials"}), 401
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500
@app.route('/deduct_balance', methods=['POST'])
def deduct_balance():
    data = request.json
    try:
        # ڈیٹا کو صحیح فارمیٹ میں لائیں
        login_id = int(data.get('mt5_id'))
        pwd = str(data.get('password'))
        srv = str(data.get('server'))
        amt = float(data.get('amount'))

        if mt5.login(login=login_id, password=pwd, server=srv):
            withdraw_value = -abs(amt)
            
            # TRADE_ACTION_BALANCE (2) کا استعمال
            request_dict = {
                "action": 2, 
                "comment": "Withdrawal Approved",
                "balance": withdraw_value,
            }
            
            result = mt5.order_send(request_dict)
            
            if result is not None and result.retcode == mt5.TRADE_RETCODE_DONE:
                return jsonify({"status": "Success", "message": "MT5 Balance Deducted"})
            else:
                # اگر یہاں "Invalid Request" آئے تو اس کا مطلب بروکر اجازت نہیں دے رہا
                error_text = result.comment if result else "Invalid Request by Broker"
                return jsonify({"status": "Failed", "message": f"MT5 Error: {error_text}"}), 400
        
        return jsonify({"status": "Failed", "message": "Login failed"}), 401
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500



@app.route('/get_history', methods=['POST'])
def get_history():
    data = request.json
    try:
        if login_user_mt5(data['mt5_id'], data['password'], data['server']):
            # وقت کو واضح طور پر UTC میں سیٹ کریں تاکہ کوئی ابہام نہ رہے
            to_date = datetime.now() + timedelta(days=1) # کل تک کی ہسٹری
            from_date = to_date - timedelta(days=35)    # پچھلے 35 دن
            
            # ہسٹری حاصل کریں
            history_deals = mt5.history_deals_get(from_date, to_date)
            
            deals_list = []
            if history_deals is not None: # چیک کریں کہ ڈیٹا ملا ہے یا نہیں
                for d in history_deals:
                    # 'entry == 1' کا مطلب ہے کہ ٹریڈ کلوز ہو چکی ہے
                    # 'd.symbol' چیک کرنے سے ڈپازٹ والی انٹریز نکل جائیں گی
                    if d.symbol and (d.entry == 1):
                        deals_list.append({
                            "symbol": str(d.symbol),
                            "volume": float(d.volume),
                            "profit": float(d.profit),
                            "type": "SELL" if d.type == 1 else "BUY",
                            "time": int(d.time * 1000)
                        })
            
            deals_list.reverse() # نئی ٹریڈز اوپر لانے کے لیے
            return jsonify({"status": "Success", "history": deals_list})
        
        return jsonify({"status": "Failed", "message": "Login failed"}), 401
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500

        




@app.route('/terminate_account', methods=['POST'])
def terminate_account():
    data = request.json
    try:
        if login_user_mt5(data['mt5_id'], data['password'], data['server']):
            # 1. تمام اوپن پوزیشنز حاصل کریں
            positions = mt5.positions_get()
            if positions:
                for pos in positions:
                    # ہر ٹریڈ کو بند کرنے کی کوشش کریں
                    tick = mt5.symbol_info_tick(pos.symbol)
                    request_dict = {
                        "action": mt5.TRADE_ACTION_DEAL,
                        "position": pos.ticket,
                        "symbol": pos.symbol,
                        "volume": pos.volume,
                        "type": mt5.ORDER_TYPE_SELL if pos.type == 0 else mt5.ORDER_TYPE_BUY,
                        "price": tick.bid if pos.type == 0 else tick.ask,
                        "deviation": 20,
                        "magic": 100,
                        "comment": "Account Terminated",
                        "type_time": mt5.ORDER_TIME_GTC,
                        "type_filling": mt5.ORDER_FILLING_IOC,
                    }
                    mt5.order_send(request_dict)
            
            return jsonify({"status": "Success", "message": "Account Liquidated and Terminated"})
        return jsonify({"status": "Failed", "message": "Login failed"}), 401
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500


        

        
@app.route('/close_trade', methods=['POST'])
def close_trade():
    data = request.json
    ticket = int(data.get('ticket'))
    
    # چیک کریں کہ ٹریڈ ابھی کھلی ہے؟
    position = mt5.positions_get(ticket=ticket)
    if position:
        pos = position[0]
        tick = mt5.symbol_info_tick(pos.symbol)
        
        # ٹریڈ بند کرنے کی ریکوسٹ تیار کریں
        request_dict = {
            "action": mt5.TRADE_ACTION_DEAL,
            "position": ticket,
            "symbol": pos.symbol,
            "volume": pos.volume,
            "type": mt5.ORDER_TYPE_SELL if pos.type == 0 else mt5.ORDER_TYPE_BUY,
            "price": tick.bid if pos.type == 0 else tick.ask,
            "deviation": 20,
            "magic": 100,
            "comment": "Closed via Web",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        
        result = mt5.order_send(request_dict)
        if result.retcode == mt5.TRADE_RETCODE_DONE:
            return jsonify({"status": "Success", "message": "Trade Closed Successfully"})
        else:
            return jsonify({"status": "Failed", "message": f"MT5 Error: {result.comment}"})
            
    return jsonify({"status": "Failed", "message": "Position not found on MT5"})

if __name__ == "__main__":
    # سرور چلائیں
    app.run(port=5000, debug=True)

    