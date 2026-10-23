package kr.matdagong.place.api;

import java.util.List;
import kr.matdagong.place.application.SamplePlaceCatalog;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** 화면과 다른 서비스가 장소 목록과 상세를 조회하는 공개 API입니다. */
@RestController
@RequestMapping("/api/v1/places")
public class PlaceController {
    private final SamplePlaceCatalog catalog;

    public PlaceController(SamplePlaceCatalog catalog) {
        this.catalog = catalog;
    }

    /** 검색어가 없으면 전체 샘플 목록을, 있으면 이름·분류·주소가 일치하는 항목만 반환합니다. */
    @GetMapping
    public List<PlaceView> list(@RequestParam(required = false) String q) {
        return catalog.findAll(q);
    }

    /** 존재하지 않는 장소 ID는 API 표준 404 응답으로 돌려줍니다. */
    @GetMapping("/{id}")
    public PlaceView get(@PathVariable String id) {
        PlaceView place = catalog.findById(id);
        if (place == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "장소를 찾을 수 없습니다.");
        return place;
    }
}
