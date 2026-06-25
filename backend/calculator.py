from datetime import datetime, timezone
import math

from bson import ObjectId
from flask import jsonify, request

from auth import is_sales, require_admin, require_auth, require_sales
from db import get_db

ROI_APPROVAL_THRESHOLD_MONTHS = 22


def _serialize_product(doc, for_sales=False):
    data = {"id": str(doc["_id"]), "name": doc["name"]}
    if not for_sales:
        data["cogs_per_kg"] = doc["cogs_per_kg"]
    return data


def _serialize_machine(doc, for_sales=False):
    data = {"id": str(doc["_id"]), "name": doc["name"]}
    if not for_sales:
        data["cost"] = doc["cost"]
    return data


def _determine_approval(months_to_recover_rounded):
    if months_to_recover_rounded is None:
        return "rejected"
    if months_to_recover_rounded < ROI_APPROVAL_THRESHOLD_MONTHS:
        return "approved"
    return "rejected"


def _serialize_inquiry_for_sales(inquiry):
    return {
        "id": str(inquiry["_id"]),
        "client_name": inquiry.get("client_name", ""),
        "created_at": inquiry["created_at"].isoformat(),
        "approval_status": inquiry.get("approval_status", "rejected"),
        "outcome_status": inquiry.get("outcome_status"),
        "unsuccessful_reason": inquiry.get("unsuccessful_reason"),
        "outcome_at": inquiry["outcome_at"].isoformat()
        if inquiry.get("outcome_at")
        else None,
    }


def _parse_float(value, field_name):
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a valid number")
    if number < 0:
        raise ValueError(f"{field_name} must be zero or greater")
    return number


def _parse_int(value, field_name):
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a valid whole number")
    if number < 0:
        raise ValueError(f"{field_name} must be zero or greater")
    return number


def compute_investment(selected_machines, monthly_orders, prices_per_kg):
    products = list(get_db().products.find().sort("name", 1))
    machines = {str(machine["_id"]): machine for machine in get_db().machines.find()}

    total_investment = 0.0
    selected_machine_breakdown = []

    for machine_id, raw_qty in (selected_machines or {}).items():
        try:
            quantity = _parse_int(raw_qty, "Machine quantity")
        except ValueError as exc:
            return None, str(exc), 400

        if quantity == 0:
            continue

        machine = machines.get(machine_id)
        if not machine:
            return None, "Selected machine not found", 400

        line_cost = machine["cost"] * quantity
        total_investment += line_cost
        selected_machine_breakdown.append(
            {
                "id": machine_id,
                "name": machine["name"],
                "quantity": quantity,
                "unit_cost": machine["cost"],
                "total_cost": round(line_cost, 2),
            }
        )

    if not selected_machine_breakdown:
        return None, "Select at least one machine", 400

    product_breakdown = []
    monthly_revenue = 0.0
    monthly_cogs = 0.0
    monthly_profit = 0.0
    total_monthly_kg = 0.0

    for product in products:
        product_id = str(product["_id"])
        try:
            moq_kg = float(monthly_orders.get(product_id, 0) or 0)
        except (TypeError, ValueError):
            return None, f"Invalid MOQ for {product['name']}", 400

        if moq_kg < 0:
            return None, f"MOQ for {product['name']} cannot be negative", 400

        if moq_kg > 0:
            if product_id not in prices_per_kg or prices_per_kg.get(product_id) in (None, ""):
                return None, f"Selling price per kg is required for {product['name']}", 400
            try:
                price_per_kg = float(prices_per_kg[product_id])
            except (TypeError, ValueError):
                return None, f"Invalid selling price for {product['name']}", 400
            if price_per_kg < 0:
                return None, f"Selling price for {product['name']} cannot be negative", 400
        else:
            price_per_kg = float(prices_per_kg.get(product_id, 0) or 0)

        cogs_per_kg = product["cogs_per_kg"]
        margin_per_kg = price_per_kg - cogs_per_kg
        revenue = price_per_kg * moq_kg
        cogs = cogs_per_kg * moq_kg
        profit = margin_per_kg * moq_kg

        monthly_revenue += revenue
        monthly_cogs += cogs
        monthly_profit += profit
        total_monthly_kg += moq_kg

        product_breakdown.append(
            {
                "id": product_id,
                "name": product["name"],
                "price_per_kg": round(price_per_kg, 2),
                "cogs_per_kg": cogs_per_kg,
                "margin_per_kg": round(margin_per_kg, 2),
                "moq_kg": moq_kg,
                "monthly_revenue": round(revenue, 2),
                "monthly_cogs": round(cogs, 2),
                "monthly_profit": round(profit, 2),
            }
        )

    has_product_input = any(row["moq_kg"] > 0 for row in product_breakdown)
    if not has_product_input:
        return None, "Enter MOQ for at least one coffee product", 400

    if monthly_profit > 0:
        months_to_recover = total_investment / monthly_profit
        months_to_recover_rounded = math.ceil(months_to_recover)
    else:
        months_to_recover = None
        months_to_recover_rounded = None

    return {
        "total_investment": round(total_investment, 2),
        "machines": selected_machine_breakdown,
        "total_monthly_kg": round(total_monthly_kg, 2),
        "monthly_revenue": round(monthly_revenue, 2),
        "monthly_cogs": round(monthly_cogs, 2),
        "monthly_profit": round(monthly_profit, 2),
        "months_to_recover": round(months_to_recover, 2) if months_to_recover is not None else None,
        "months_to_recover_rounded": months_to_recover_rounded,
        "product_breakdown": product_breakdown,
    }, None, 200


def list_products():
    for_sales = is_sales(request.current_user)
    products = get_db().products.find().sort("name", 1)
    return jsonify(
        {"products": [_serialize_product(p, for_sales=for_sales) for p in products]}
    )


def create_product():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Product name is required"}), 400

    try:
        cogs_per_kg = _parse_float(data.get("cogs_per_kg"), "COGS per kg")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    doc = {
        "name": name,
        "cogs_per_kg": cogs_per_kg,
        "created_at": datetime.now(timezone.utc),
    }
    result = get_db().products.insert_one(doc)
    doc["_id"] = result.inserted_id
    return jsonify({"product": _serialize_product(doc)}), 201


def update_product(product_id):
    data = request.get_json(silent=True) or {}
    updates = {}

    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"error": "Product name is required"}), 400
        updates["name"] = name

    try:
        if "cogs_per_kg" in data:
            updates["cogs_per_kg"] = _parse_float(data.get("cogs_per_kg"), "COGS per kg")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    result = get_db().products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": updates},
    )
    if result.matched_count == 0:
        return jsonify({"error": "Product not found"}), 404

    product = get_db().products.find_one({"_id": ObjectId(product_id)})
    return jsonify({"product": _serialize_product(product)})


def delete_product(product_id):
    result = get_db().products.delete_one({"_id": ObjectId(product_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Product not found"}), 404
    return jsonify({"message": "Product deleted"})


def list_machines():
    for_sales = is_sales(request.current_user)
    machines = get_db().machines.find().sort("name", 1)
    return jsonify(
        {"machines": [_serialize_machine(m, for_sales=for_sales) for m in machines]}
    )


def create_machine():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Machine name is required"}), 400

    try:
        cost = _parse_float(data.get("cost"), "Machine cost")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    doc = {
        "name": name,
        "cost": cost,
        "created_at": datetime.now(timezone.utc),
    }
    result = get_db().machines.insert_one(doc)
    doc["_id"] = result.inserted_id
    return jsonify({"machine": _serialize_machine(doc)}), 201


def update_machine(machine_id):
    data = request.get_json(silent=True) or {}
    updates = {}

    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"error": "Machine name is required"}), 400
        updates["name"] = name

    try:
        if "cost" in data:
            updates["cost"] = _parse_float(data.get("cost"), "Machine cost")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    result = get_db().machines.update_one(
        {"_id": ObjectId(machine_id)},
        {"$set": updates},
    )
    if result.matched_count == 0:
        return jsonify({"error": "Machine not found"}), 404

    machine = get_db().machines.find_one({"_id": ObjectId(machine_id)})
    return jsonify({"machine": _serialize_machine(machine)})


def delete_machine(machine_id):
    result = get_db().machines.delete_one({"_id": ObjectId(machine_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Machine not found"}), 404
    return jsonify({"message": "Machine deleted"})


def create_inquiry():
    data = request.get_json(silent=True) or {}
    client_name = (data.get("client_name") or "").strip() or "Unnamed client"

    result, error, status = compute_investment(
        data.get("selected_machines") or {},
        data.get("monthly_orders") or {},
        data.get("prices_per_kg") or {},
    )
    if error:
        return jsonify({"error": error}), status

    approval_status = _determine_approval(result.get("months_to_recover_rounded"))

    doc = {
        "client_name": client_name,
        "selected_machines": data.get("selected_machines") or {},
        "monthly_orders": data.get("monthly_orders") or {},
        "prices_per_kg": data.get("prices_per_kg") or {},
        "result": result,
        "approval_status": approval_status,
        "outcome_status": None,
        "unsuccessful_reason": None,
        "outcome_at": None,
        "created_by": request.current_user["id"],
        "created_at": datetime.now(timezone.utc),
    }
    inserted = get_db().inquiries.insert_one(doc)
    doc["_id"] = inserted.inserted_id

    return jsonify({"inquiry": _serialize_inquiry_for_sales(doc)}), 201


def list_inquiries():
    view = (request.args.get("view") or "approved").strip().lower()
    base_query = {"created_by": request.current_user["id"]}

    if view == "approved":
        query = {
            **base_query,
            "approval_status": "approved",
            "$or": [{"outcome_status": None}, {"outcome_status": {"$exists": False}}],
        }
    elif view == "successful":
        query = {**base_query, "outcome_status": "successful"}
    elif view == "failed":
        query = {**base_query, "outcome_status": "unsuccessful"}
    else:
        return jsonify({"error": "Invalid view"}), 400

    inquiries = get_db().inquiries.find(query).sort("created_at", -1)
    return jsonify(
        {
            "inquiries": [
                _serialize_inquiry_for_sales(inquiry) for inquiry in inquiries
            ]
        }
    )


def update_inquiry_outcome(inquiry_id):
    data = request.get_json(silent=True) or {}
    outcome = (data.get("outcome") or "").strip().lower()

    if outcome not in {"successful", "unsuccessful"}:
        return jsonify({"error": "Outcome must be successful or unsuccessful"}), 400

    inquiry = get_db().inquiries.find_one(
        {
            "_id": ObjectId(inquiry_id),
            "created_by": request.current_user["id"],
            "approval_status": "approved",
            "$or": [{"outcome_status": None}, {"outcome_status": {"$exists": False}}],
        }
    )
    if not inquiry:
        return jsonify({"error": "Approved inquiry not found"}), 404

    unsuccessful_reason = (data.get("reason") or "").strip()
    if outcome == "unsuccessful" and not unsuccessful_reason:
        return jsonify({"error": "Reason is required for unsuccessful outcome"}), 400

    updates = {
        "outcome_status": outcome,
        "outcome_at": datetime.now(timezone.utc),
        "unsuccessful_reason": unsuccessful_reason if outcome == "unsuccessful" else None,
    }
    get_db().inquiries.update_one({"_id": inquiry["_id"]}, {"$set": updates})
    inquiry.update(updates)

    return jsonify({"inquiry": _serialize_inquiry_for_sales(inquiry)})


def register_calculator_routes(app):
    app.get("/api/products")(require_auth(list_products))
    app.post("/api/products")(require_admin(create_product))
    app.put("/api/products/<product_id>")(require_admin(update_product))
    app.delete("/api/products/<product_id>")(require_admin(delete_product))

    app.get("/api/machines")(require_auth(list_machines))
    app.post("/api/machines")(require_admin(create_machine))
    app.put("/api/machines/<machine_id>")(require_admin(update_machine))
    app.delete("/api/machines/<machine_id>")(require_admin(delete_machine))

    app.post("/api/inquiries")(require_sales(create_inquiry))
    app.get("/api/inquiries")(require_sales(list_inquiries))
    app.patch("/api/inquiries/<inquiry_id>/outcome")(require_sales(update_inquiry_outcome))
