import webview
import sys

def create_window():
    """Create a simple webview window for Hachi"""
    
    # Create the webview window
    window = webview.create_window(
        title='Hachi - Photo Management System',
        url='http://localhost:5173',
        width=1200,
        height=800,
        min_size=(800, 600),
        resizable=True,
        shadow=True,
        on_top=False,
        background_color='#f8f9fa'
    )
    
    return window

def main():
    """Main function to start the webview"""
    try:
        # Create the window
        create_window()
        
        # Start the webview (this will block until window is closed)
        webview.start(debug=False)
        
    except KeyboardInterrupt:
        print("Window closed by user")
        sys.exit(0)
    except Exception as e:
        print(f"Error creating window: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()