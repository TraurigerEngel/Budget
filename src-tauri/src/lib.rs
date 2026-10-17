mod budget;
mod storage;

use serde_json::Value;
use tauri::{Manager, WebviewWindow};

#[tauri::command] fn budget_storage_preflight()->Result<(),String>{storage::ensure_database()}
#[tauri::command] fn budget_get_bootstrap()->Result<String,String>{budget::bootstrap()}
#[tauri::command] fn budget_get_summary(period:String,user_id:i64,category_ids:Vec<i64>)->Result<String,String>{budget::summary(&period,user_id,&category_ids)}
#[tauri::command] fn budget_get_transactions(limit:i64,user_id:i64,period:String,category_ids:Vec<i64>)->Result<String,String>{budget::transactions(limit,user_id,&period,&category_ids)}
#[tauri::command] fn budget_get_account_stats(user_id:i64)->Result<String,String>{budget::account_stats(user_id)}
#[tauri::command] fn budget_get_category_stats(user_id:i64)->Result<String,String>{budget::category_stats(user_id)}
#[tauri::command] fn budget_get_monthly_category_stats(period:String,user_id:i64,category_ids:Vec<i64>)->Result<String,String>{budget::monthly_category_stats(&period,user_id,&category_ids)}
#[tauri::command] fn budget_get_monthly_account_stats(period:String,user_id:i64,category_ids:Vec<i64>)->Result<String,String>{budget::monthly_account_stats(&period,user_id,&category_ids)}
#[tauri::command] fn budget_add_transaction(input:Value)->Result<Value,String>{budget::add_transaction(&input)}
#[tauri::command] fn budget_delete_transaction(id:i64,user_id:i64)->Result<Value,String>{budget::delete_transaction(id,user_id)}
#[tauri::command] fn budget_add_account(name:String,opening_balance_cents:i64,user_id:i64)->Result<Value,String>{budget::add_account(&name,opening_balance_cents,user_id)}
#[tauri::command] fn budget_archive_account(id:i64,user_id:i64)->Result<Value,String>{budget::archive_account(id,user_id)}
#[tauri::command] fn budget_rename_account(id:i64,name:String,user_id:i64)->Result<Value,String>{budget::rename_account(id,&name,user_id)}
#[tauri::command] fn budget_add_category(name:String,kind:String)->Result<Value,String>{budget::add_category(&name,&kind)}
#[tauri::command] fn budget_delete_category(id:i64)->Result<Value,String>{budget::delete_category(id)}
#[tauri::command] fn window_minimize(window:WebviewWindow)->Result<(),String>{window.minimize().map_err(|e|e.to_string())}
#[tauri::command] fn window_close(window:WebviewWindow)->Result<(),String>{window.close().map_err(|e|e.to_string())}

#[cfg(windows)]
fn configure_windows_webview(window:&WebviewWindow){
  use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Settings3;
  use windows::core::Interface;
  if let Err(error)=window.with_webview(|webview|unsafe{let Ok(webview2)=webview.controller().CoreWebView2() else{return;};let Ok(settings)=webview2.Settings() else{return;};let _=settings.SetAreDefaultContextMenusEnabled(false);if let Ok(settings3)=settings.cast::<ICoreWebView2Settings3>(){let _=settings3.SetAreBrowserAcceleratorKeysEnabled(false);}}){eprintln!("[Budget] WebView2 hardening warning: {error}");}
}

#[cfg_attr(mobile,tauri::mobile_entry_point)]
pub fn run(){
  tauri::Builder::default().setup(|app|{
    if let Some(window)=app.get_webview_window("main"){
      #[cfg(windows)] configure_windows_webview(&window);
    }
    Ok(())
  }).invoke_handler(tauri::generate_handler![
    budget_get_bootstrap,budget_get_summary,budget_get_transactions,budget_get_account_stats,budget_get_category_stats,budget_get_monthly_category_stats,budget_get_monthly_account_stats,
    budget_add_transaction,budget_delete_transaction,budget_add_account,budget_archive_account,budget_rename_account,budget_add_category,budget_delete_category,
    budget_storage_preflight,window_minimize,window_close,
  ]).run(tauri::generate_context!()).expect("error while running Budget Standalone");
}
