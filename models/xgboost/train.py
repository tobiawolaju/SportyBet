#hard rules:
#train per league
#time-based split only
#objective: reg:squarederror
#eval metric: MAE, not RMSE


#model.bin
#feature_schema.json


def train_model(data_path):
    print(f"Training XGBoost model on {data_path}...")
    # Add training logic here
    pass

if __name__ == "__main__":
    train_model("data/splits/cba_train.csv")
