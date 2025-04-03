import streamlit as st
import pandas as pd
from openpyxl import load_workbook
import os
import tempfile
import numpy as np

DEFAULT_FILE = os.path.abspath("metadata-example.xlsx")
ENGINE = 'openpyxl'

def save_excel_with_sheet(df, file_path, sheet_name):
    """Save a single sheet while preserving other sheets"""
    try:
        if not isinstance(df, pd.DataFrame):
            raise ValueError("Expected DataFrame, got {}".format(type(df)))

        # Create temp file
        temp_path = tempfile.mktemp(suffix='.xlsx')
        
        # Load existing workbook
        book = load_workbook(file_path)
        
        # Create new writer
        with pd.ExcelWriter(temp_path, engine=ENGINE) as writer:
            # Copy all sheets
            for sheet in book.sheetnames:
                if sheet == sheet_name:
                    # Write edited sheet
                    df.to_excel(writer, sheet_name=sheet, index=False)
                else:
                    # Copy existing sheet
                    sheet_df = pd.read_excel(file_path, sheet_name=sheet, engine=ENGINE)
                    sheet_df.to_excel(writer, sheet_name=sheet, index=False)
            
        # Replace original file
        os.replace(temp_path, file_path)
        st.toast(f"Saved changes to {sheet_name}!", icon="✅")
        return True
        
    except Exception as e:
        st.error(f"Save failed: {str(e)}")
        if os.path.exists(temp_path):
            os.unlink(temp_path)
        return False

def clean_data(df):
    """Handle mixed data types and NaN values"""
    for col in df.columns:
        # Convert mixed numeric columns
        if pd.api.types.is_string_dtype(df[col]):
            try:
                df[col] = pd.to_numeric(df[col], errors='ignore')
            except:
                pass
        # Fill NaN with empty string for string columns
        if pd.api.types.is_string_dtype(df[col]):
            df[col] = df[col].fillna('')
    return df

def main():
    st.set_page_config(layout="wide")
    st.title("Excel Data Editor with Built-in Filters")
    
    if os.path.exists(DEFAULT_FILE):
        try:
            xls = pd.ExcelFile(DEFAULT_FILE, engine=ENGINE)
            sheets = xls.sheet_names
            
            # Create tabs for each sheet
            tabs = st.tabs(sheets)
            
            for i, sheet in enumerate(sheets):
                with tabs[i]:
                    # Load and clean sheet data
                    df = pd.read_excel(DEFAULT_FILE, sheet_name=sheet, engine=ENGINE)
                    df = clean_data(df)
                    
                    # Data editor with built-in filters
                    edited_df = st.data_editor(
                        df,
                        num_rows="dynamic",
                        key=f"editor_{sheet}",
                        use_container_width=True,
                        hide_index=True,
                        column_config={
                            "_index": st.column_config.NumberColumn(disabled=True),
                        }
                    )
                    
                    # Save on change
                    if not df.equals(edited_df):
                        save_excel_with_sheet(edited_df, DEFAULT_FILE, sheet)
                        
        except Exception as e:
            st.error(f"Error: {str(e)}")
    else:
        st.error(f"File not found: {DEFAULT_FILE}")

if __name__ == "__main__":
    main()