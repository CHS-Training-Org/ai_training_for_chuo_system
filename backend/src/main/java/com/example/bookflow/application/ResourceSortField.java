package com.example.bookflow.application;

/**
 * {@code sort} パラメータで指定できるフィールド（BR-01）。
 *
 * <p>{@link com.example.bookflow.presentation.ResourceController}（許可フィールド検証）と {@link
 * ResourceService}（{@link java.util.Comparator} 導出）の双方が本 enum を参照することで、許可フィールドの定義を一箇所に集約する。
 */
public enum ResourceSortField {
  NAME("name"),
  CAPACITY("capacity"),
  CREATED_AT("createdAt");

  private final String property;

  ResourceSortField(String property) {
    this.property = property;
  }

  public String property() {
    return property;
  }

  public static boolean isAllowed(String property) {
    return fromProperty(property) != null;
  }

  public static ResourceSortField fromProperty(String property) {
    for (ResourceSortField field : values()) {
      if (field.property.equals(property)) {
        return field;
      }
    }
    return null;
  }
}
