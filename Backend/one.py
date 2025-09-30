import os

def print_tree(directory, prefix=""):
    # Exclude node_modules
    if "node_modules" in directory:
        return
    
    items = sorted(os.listdir(directory))
    pointers = ["├── "] * (len(items) - 1) + ["└── "]

    for pointer, item in zip(pointers, items):
        path = os.path.join(directory, item)
        print(prefix + pointer + item)

        if os.path.isdir(path) and item != "node_modules":
            extension = "│   " if pointer == "├── " else "    "
            print_tree(path, prefix + extension)


if __name__ == "__main__":
    print(".")  # Root directory
    print_tree(os.getcwd())
